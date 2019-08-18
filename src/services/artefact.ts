import { CommHelper } from './comm-helper';
import { StateManager } from '@/state';
import { ImagedObject } from '@/models/imaged-object';
import { ImagedObjectDTO } from '@/dtos/sqe-dtos';


class ArtefactService {
    public stateManager: StateManager;
    constructor() {
        this.stateManager = StateManager.instance;
    }

    public async getArtefactImagedObject(editionId: number, imagedObjectId: string): Promise<ImagedObject> {
        const response = await CommHelper.get<ImagedObjectDTO>
        (`/v1/editions/${editionId}/imaged-objects/${imagedObjectId}`);
        // if (response.data) {
        const imagedObject = new ImagedObject(response.data);
        // }
        return imagedObject;
    }
}

export default ArtefactService;
