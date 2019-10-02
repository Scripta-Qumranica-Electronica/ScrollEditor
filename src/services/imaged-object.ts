import { ImagedObject } from '@/models/imaged-object';
import EditionService from './edition';
import { CommHelper } from './comm-helper';
import { ApiRoutes } from '@/services/api-routes';
import { StateManager } from '@/state';
import { Artefact } from '@/models/artefact';
import { ImagedObjectDTO, ImagedObjectListDTO } from '@/dtos/sqe-dtos';


class ImagedObjectService {
    public stateManager: StateManager;
    constructor() {
        this.stateManager = StateManager.instance;
    }

    public async getImagedObjectArtefacts(editionId: number, imagedObjectId: string): Promise<Artefact[]> {
        const response = await CommHelper.get<ImagedObjectDTO>(
            ApiRoutes.editionImagedObjectUrl(editionId, imagedObjectId, true)
        );

        let artefactList: Artefact[] = [];
        if (response.data.artefacts) {
            artefactList = response.data.artefacts.map((obj: any) => new Artefact(obj));
        }

        return artefactList;
    }

    public async getEditionImagedObjects(editionId: number): Promise<ImagedObject[]> {
        const response = await CommHelper.get<ImagedObjectListDTO>(
            ApiRoutes.allEditionImagedObjectsUrl(editionId, true)
        );

        return response.data.imagedObjects.map((d: any) => new ImagedObject(d));
    }

    // The position is a transform matrix for positioning the
    // artifact properly in the coordinate system of the virtual scroll.
    // todo: changeArtefact position: add position to the body
    // const transformMatrix = artefact.transformMatrix ?
    //     artefact.transformMatrix :
    //     '{"matrix": [[1, 0, 0], [0, 1, 0]]}';

    private _getCachedImagedObject(editionId: number, imagedObjectId: string): ImagedObject | undefined {
        if (!this.stateManager.editions.current || editionId !== this.stateManager.editions.current.id) {
            return undefined;
        }
        if (!this.stateManager.imagedObjects.items) {
            return undefined;
        }

        return this.stateManager.imagedObjects.items.find((io: ImagedObject) => io.id === imagedObjectId);
    }

    private async _getImagedObject(editionId: number, imagedObjectId: string) {
        const editionService = new EditionService();
        const imagedObjectList = await this.getEditionImagedObjects(editionId);

        return imagedObjectList.find((io: ImagedObject) => io.id === imagedObjectId);
    }
}

export default ImagedObjectService;
