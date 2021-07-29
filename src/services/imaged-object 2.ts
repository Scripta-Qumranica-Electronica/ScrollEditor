import { ImagedObject } from '@/models/imaged-object';
import { CommHelper } from './comm-helper';
import { ApiRoutes } from '@/services/api-routes';
import { ImagedObjectListDTO } from '@/dtos/sqe-dtos';
import { StateManager } from '@/state';


class ImagedObjectService {
    public stateManager: StateManager;

    constructor() {
        this.stateManager = StateManager.instance;
    }

    public async getEditionImagedObjects(editionId: number): Promise<ImagedObject[]> {
        const edition = this.stateManager.editions.find(editionId);
        if (!edition) {
            throw new Error(`Can't get imaged objects of non existing edition ${editionId}`);
        }

        const response = await CommHelper.get<ImagedObjectListDTO>(
            ApiRoutes.allEditionImagedObjectsUrl(editionId, true)
        );

        return response.data.imagedObjects.map(d => new ImagedObject(d, edition));
    }
}

export default ImagedObjectService;
