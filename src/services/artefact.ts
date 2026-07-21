import { CommHelper } from './comm-helper';
import { ImagedObject } from '@/models/imaged-object';
import {
    ArtefactListDTO,
    ExtendedArtefactListDTO,
    ExtendedArtefactDTO,
    CreateArtefactDTO,
    ArtefactDTO,
    UpdateArtefactDTO
} from '@/dtos/sqe-dtos';
import { Artefact } from '@/models/artefact';
import { ImageStack } from '@/models/image';
import { ApiRoutes } from '@/services/api-routes';
import { Side } from '@/models/misc';
import { StateManager } from '@/state';

class ArtefactService {
    public async getEditionArtefacts(editionId: number): Promise<Artefact[]> {
        // Load the artefacts mask-free but WITH their master image (url + IIIF
        // manifest). Carrying the master image lets the artefacts view render
        // without loading the edition's imaged objects. Masks stay lazy (see
        // StateService.artefactMask / getArtefactMask below).
        const response = await CommHelper.get<ExtendedArtefactListDTO>(
            ApiRoutes.allEditionArtefactsUrl(editionId, 'images')
        );
        const edition = this.stateManager.editions.find(editionId);

        return response.data.artefacts.map((d: ExtendedArtefactDTO) => {
            const artefact = new Artefact(d);
            if (edition && d.url && d.imageManifest && !artefact.isVirtual) {
                artefact.imageStack = ImageStack.fromMasterImage(
                    d.imageId,
                    d.url,
                    d.imageManifest,
                    d.ppi,
                    d.side,
                    edition
                );
            }
            return artefact;
        });
    }

    // Fetch a single artefact's mask (WKT). Used for lazy per-artefact loading.
    public async getArtefactMask(
        editionId: number,
        artefactId: number
    ): Promise<string> {
        const response = await CommHelper.get<ArtefactDTO>(
            ApiRoutes.editionArtefactUrl(editionId, artefactId, true)
        );
        return response.data.mask || '';
    }

    // Fetch all masks for an edition in one request. Used when a mask-heavy view
    // (e.g. the scroll editor) needs many masks at once.
    public async getEditionArtefactMasks(
        editionId: number
    ): Promise<ArtefactDTO[]> {
        const response = await CommHelper.get<ArtefactListDTO>(
            ApiRoutes.allEditionArtefactMasksUrl(editionId)
        );
        return response.data.artefacts;
    }

    public async createArtefact(
        editionId: number,
        imagedObject: ImagedObject,
        artefactName: string,
        side: Side
    ): Promise<Artefact> {
        const imageStack =
            side === 'recto' ? imagedObject.recto : imagedObject.verso;

        if (!imageStack) {
            throw Error(
                `ImagedObject ${imagedObject.id} does not have the ${side} side`
            );
        }

        const masterImage = imageStack.images.find(im => im.master);
        if (!masterImage) {
            throw Error(
                `ImagedObject ${imagedObject.id}, side ${side} has no master image`
            );
        }
        const body = {
            masterImageId: masterImage.id,
            placement: {
                rotate: 0,
                scale: 1,
                translate: {
                    x: 0,
                    y: 0
                }
            },
            name: artefactName
        } as CreateArtefactDTO;
        const response = await CommHelper.post<ArtefactDTO>(
            ApiRoutes.allEditionArtefactsUrl(editionId),
            body
        );

        const artefact = new Artefact(response.data);
        this.stateManager.artefacts.add(artefact, false);
        this.stateManager.touchEdition(editionId);

        return artefact;
    }

    public async deleteArtefact(art: Artefact) {
        await CommHelper.delete(
            ApiRoutes.editionArtefactUrl(art.editionId, art.id)
        );
        this.stateManager.touchEdition(art.editionId);
    }

    public async copyArtefact(
        editionId: number,
        artefact: Artefact
    ): Promise<Artefact> {
        const artefactImagedObject = this.stateManager.imagedObjects.find(artefact.imagedObjectId);
        const masterImage = artefactImagedObject?.getImageStack(artefact.side)?.images.find(im => im.master);
        if (!masterImage) {
            throw Error(
                `ImagedObject ${artefactImagedObject?.id}, side ${artefact.side} has no master image`
            );
        }
        const body = {
            mask: artefact.mask.wkt,
            placement: artefact.placement,
            maskEditorId: 0,
            positionEditorId: 0,
            name: artefact.name,
            statusMessage: '',
            masterImageId : masterImage.id
        } as UpdateArtefactDTO;

        const response = await CommHelper.post<ArtefactDTO>(
            ApiRoutes.allEditionArtefactsUrl(editionId),
            body
        );

        const newArtefact = new Artefact(response.data);
        this.stateManager.artefacts.add(artefact, false);
        this.stateManager.touchEdition(editionId);

        return newArtefact;
    }

    public async changeArtefact(
        editionId: number,
        artefact: Artefact
    ): Promise<ArtefactDTO> {
        const body = {
            mask: artefact.mask.wkt,
            placement: artefact.placement,
            maskEditorId: 0,
            positionEditorId: 0,
            // zOrder: artefact.zOrder,
            name: artefact.name,
            statusMessage: ''
        } as UpdateArtefactDTO;

        const response = await CommHelper.put<ArtefactDTO>(
            ApiRoutes.editionArtefactUrl(editionId, artefact.id),
            body
        );

        // Update the state
        const changed = new Artefact(response.data);
        this.stateManager.artefacts.update(changed);
        this.stateManager.touchEdition(editionId);
        return response.data;
    }

    private get stateManager() {
        return StateManager.instance;
    }
}

export default ArtefactService;
