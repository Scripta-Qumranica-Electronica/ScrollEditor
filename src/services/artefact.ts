import { CommHelper } from './comm-helper';
import { StateManager } from '@/state';
import { ImagedObject } from '@/models/imaged-object';
import { ImagedObjectDTO } from '@/dtos/sqe-dtos';
import { Artefact } from '@/models/artefact';
import EditionService from './edition';
import { ApiRoutes } from '@/variables';

class ArtefactService {
    public stateManager: StateManager;
    constructor() {
        this.stateManager = StateManager.instance;
    }
    public async requestArtefactImagedObject(editionId: number, imagedObjectId: string) {
        const response = await CommHelper.get<ImagedObjectDTO>
        (ApiRoutes.editionImagedObjectUrl(editionId, imagedObjectId));

        const imagedObject = new ImagedObject(response.data);
        return imagedObject;
    }
    /*public async getArtefactImagedObject(editionId: number, imagedObjectId: string) {
        const response = await CommHelper.get<ImagedObjectDTO>
        (ApiRoutes.editionImagedObjectUrl(editionId, imagedObjectId));

        const imagedObject = new ImagedObject(response.data);
        return imagedObject;
    }*/

    public async getArtefactInfo(editionId: number, artefactId: number) {
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
        const artefacts = await editionService.requestEditionArtefacts(editionId);

        return artefacts.find((a: Artefact) => a.id === artefactId);
    }
}

export default ArtefactService;
