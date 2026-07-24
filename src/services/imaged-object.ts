import { ImagedObject } from '@/models/imaged-object';
import { CommHelper } from './comm-helper';
import { ApiRoutes } from '@/services/api-routes';
import { ImagedObjectListDTO } from '@/dtos/sqe-dtos';
import { currentState } from '@/state/current';
import type { StateManager } from '@/state';


class ImagedObjectService {
    public stateManager: StateManager;

    constructor() {
        this.stateManager = currentState();
    }

    public async getEditionImagedObjects(editionId: number): Promise<ImagedObject[]> {
        const edition = this.stateManager.editions.find(editionId);
        if (!edition) {
            throw new Error(`Can't get imaged objects of non existing edition ${editionId}`);
        }

        // Note: we deliberately do NOT request the embedded artefacts/masks here.
        // They duplicate the separately-loaded artefacts collection (and its masks,
        // which are large). The state service links each imaged object's artefacts
        // from $state.artefacts by imagedObjectId after both collections load.
        const response = await CommHelper.get<ImagedObjectListDTO>(
            ApiRoutes.allEditionImagedObjectsUrl(editionId)
        );

        return response.data.imagedObjects.map(d => new ImagedObject(d, edition));
    }
}

export default ImagedObjectService;
