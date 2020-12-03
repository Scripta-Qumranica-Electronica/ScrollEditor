import { CommHelper } from './comm-helper';
import { ImagedObject } from '@/models/imaged-object';
import { ArtefactListDTO, CreateArtefactDTO, ArtefactDTO, UpdateArtefactDTO } from '@/dtos/sqe-dtos';
import { Artefact } from '@/models/artefact';
import { ApiRoutes } from '@/services/api-routes';
import { Side } from '@/models/misc';
import { StateManager } from '@/state';

class ArtefactService {
    public async getEditionArtefacts(editionId: number): Promise<Artefact[]> {
        const response = await CommHelper.get<ArtefactListDTO>(
            ApiRoutes.allEditionArtefactsUrl(editionId, true)
        );

        return response.data.artefacts.map((d: any) => new Artefact(d));
    }

    public async createArtefact(editionId: number, imagedObject: ImagedObject, artefactName: string, side: Side):
        Promise<Artefact> {
        const imageStack = side === 'recto' ? imagedObject.recto : imagedObject.verso;

        if (!imageStack) {
            throw Error(`ImagedObject ${imagedObject.id} does not have the ${side} side`);
        }

        const masterImage = imageStack.images.find((im) => im.master);
        if (!masterImage) {
            throw Error(`ImagedObject ${imagedObject.id}, side ${side} has no master image`);
        }
        const body = {
            masterImageId: masterImage.id,
            mask: '',
            placement: {
                rotate: 0,
                scale: 1,
                translate: {
                    x: 0,
                    y: 0,
                }
            },
            name: artefactName,
        } as CreateArtefactDTO;
        const response = await CommHelper.post<ArtefactDTO>(ApiRoutes.allEditionArtefactsUrl(editionId), body);

        const artefact = new Artefact(response.data);
        this.stateManager.artefacts.add(artefact);
        return artefact;
    }

    public async deleteArtefact(art: Artefact) {
        await CommHelper.delete(ApiRoutes.editionArtefactUrl(art.editionId, art.id));
    }

    public async changeArtefact(editionId: number, artefact: Artefact):
        Promise<ArtefactDTO> {
        const body = {
                mask: artefact.mask.wkt,
                placement: artefact.placement,
                maskEditorId: 0,
                positionEditorId: 0,
            // zOrder: artefact.zOrder,
            name: artefact.name,
            statusMessage: '',
        } as UpdateArtefactDTO;

        const response = await CommHelper.put<ArtefactDTO>
            (ApiRoutes.editionArtefactUrl(editionId, artefact.id), body);

        // Update the state
        const changed = new Artefact(response.data);
        this.stateManager.artefacts.update(changed);
        return response.data;
    }

    private get stateManager() {
        return StateManager.instance;
    }
}

export default ArtefactService;
