import { CommHelper } from './comm-helper';
import { ImagedObject } from '@/models/imaged-object';
import { ArtefactListDTO, CreateArtefactDTO, ArtefactDTO, UpdateArtefactDTO } from '@/dtos/sqe-dtos';
import { Artefact } from '@/models/artefact';
import { ApiRoutes } from '@/services/api-routes';
import { Side } from '@/models/misc';
import { OptimizedArtefact } from '@/views/imaged-object-editor/types';

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
            name: artefactName,
        } as CreateArtefactDTO;
        const response = await CommHelper.post<ArtefactDTO>(ApiRoutes.allEditionArtefactsUrl(editionId), body);

        const artefact = new Artefact(response.data);
        return artefact;
    }

    public async deleteArtefact(art: OptimizedArtefact) { // TODO: Pass an ordinary artefact
        await CommHelper.delete(ApiRoutes.editionArtefactUrl(art.editionId, art.id));
    }

    public async changeArtefact(editionId: number, artefact: Artefact):
        Promise<ArtefactDTO> {
        const mask = artefact.mask ? artefact.mask.polygon.wkt : '';
        const body = {
            mask,
            name: artefact.name,
        } as UpdateArtefactDTO;

        const response = await CommHelper.put<ArtefactDTO>
            (ApiRoutes.editionArtefactUrl(editionId, artefact.id), body);
        return response.data;
    }
}

export default ArtefactService;
