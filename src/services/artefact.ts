import { CommHelper } from './comm-helper';
import { StateManager } from '@/state';
import { ImagedObject } from '@/models/imaged-object';
import { ArtefactListDTO, CreateArtefactDTO, ArtefactDTO, UpdateArtefactDTO } from '@/dtos/sqe-dtos';
import { Artefact } from '@/models/artefact';
import EditionService from './edition';
import { ApiRoutes } from '@/services/api-routes';
import { Side } from '@/models/misc';
import { OptimizedArtefact } from '@/views/imaged-object-editor/types';

class ArtefactService {
    public stateManager: StateManager;
    constructor() {
        this.stateManager = StateManager.instance;
    }

    public async getArtefact(editionId: number, artefactId: number) {
        let artefact = this._getCachedArtefact(editionId, artefactId);
        if (!artefact) {
            artefact = await this._getArtefact(editionId, artefactId);
        }

        if (!artefact) {
            throw new Error(`Can't find artefact with id ${artefactId}`);
        }

        this.stateManager.artefacts.current = artefact;

        return artefact;
    }

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

    private _getCachedArtefact(editionId: number, artefactId: number): Artefact | undefined {
        if (!this.stateManager.editions.current || editionId !== this.stateManager.editions.current.id) {
            return undefined;
        }
        if (!this.stateManager.artefacts.items) {
            return undefined;
        }

        return this.stateManager.artefacts.items.find((a: Artefact) => a.id === artefactId);
    }

    private async _getArtefact(editionId: number, artefactId: number) {
        const editionService = new EditionService();
        const artefacts = await this.getEditionArtefacts(editionId);

        return artefacts.find((a: Artefact) => a.id === artefactId);
    }
}

export default ArtefactService;
