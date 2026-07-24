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
import { v7 as uuidv7 } from 'uuid';
import { applyArtefactDto, registerPendingOperation } from '@/state/notification-handler';
import { addToArray, removeFromArray } from '@/utils/collection-utils';
import { ApiRoutes } from '@/services/api-routes';
import { Side } from '@/models/misc';
import { currentState } from '@/state/current';

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
        // The imaged-object editor lists imagedObject.artefacts (a stored array, not
        // derived from the global collection), so add the new artefact there too or it
        // never appears in the right-side listing until reload. addToArray dedupes, so
        // this is safe even if the CreatedArtefact SignalR broadcast also arrives.
        addToArray(artefact, imagedObject.artefacts);
        this.stateManager.touchEdition(editionId);

        return artefact;
    }

    public async deleteArtefact(art: Artefact) {
        await CommHelper.delete(
            ApiRoutes.editionArtefactUrl(art.editionId, art.id)
        );
        // Remove locally now (don't rely on the DeletedArtefact broadcast): both the
        // global collection and the owning imaged object's stored list.
        this.stateManager.artefacts.remove(art.id, false);
        const imagedObject = this.stateManager.imagedObjects.find(art.imagedObjectId);
        removeFromArray(art.id, imagedObject?.artefacts);
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
        // Send the master image of the artefact's side. The server needs it the FIRST time a
        // mask is written (a newly-created artefact has no shape row yet) so it can record the
        // artefact's side; it is ignored once a shape exists. Look it up defensively — if the
        // owning imaged object isn't in state, we simply omit it (prior behaviour).
        const imagedObject = this.stateManager.imagedObjects.find(artefact.imagedObjectId);
        const masterImageId = imagedObject
            ?.getImageStack(artefact.side)
            ?.images.find((im) => im.master)?.id;
        const body = {
            mask: artefact.mask.wkt,
            placement: artefact.placement,
            maskEditorId: 0,
            positionEditorId: 0,
            // zOrder: artefact.zOrder,
            name: artefact.name,
            statusMessage: '',
            masterImageId
        } as UpdateArtefactDTO;

        // opId reconciliation: tag this mutation with a sortable UUIDv7 so we
        // recognise its own broadcast echo, and apply the response through the
        // SAME reducer the SignalR handler uses (unifying the HTTP + realtime
        // write paths — see applyArtefactDto in notification-handler.ts).
        const opId = uuidv7();
        registerPendingOperation(opId);
        const response = await CommHelper.put<ArtefactDTO>(
            ApiRoutes.editionArtefactUrl(editionId, artefact.id),
            body,
            true,
            opId
        );

        applyArtefactDto(response.data, true);
        this.stateManager.touchEdition(editionId);
        return response.data;
    }

    private get stateManager() {
        return currentState();
    }
}

export default ArtefactService;
