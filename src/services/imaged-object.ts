import { Store } from 'vuex';
import { Communicator, NotFoundError } from './communications';
import { ImagedObject } from '@/models/imaged-object';
import EditionService from './edition';
import { Artefact } from '@/models/artefact';

export interface ArtefactCreateResult {
    returned_info: number;
}
export interface ArtefactShapeChangedResult {
}
export interface ArtefactPositionChangedResult {
}
export interface ArtefactNameChangedResult {
}

class ImagedObjectService {
    private communicator: Communicator;

    constructor(private store: Store<any>) {
        this.communicator = new Communicator(store);
    }

    public async fetchImagedObjectInfo(editionId: number, imagedObjectId: string) {
        let imagedObject = this._getCachedImagedObject(editionId, imagedObjectId);
        if (!imagedObject) {
            imagedObject = await this._getImagedObject(editionId, imagedObjectId);
        }

        if (!imagedObject) {
            throw new NotFoundError('imagedObject', imagedObjectId);
        }
        const artefacts = await this.getImagedObjectArtefacts(editionId, imagedObject);
        imagedObject.artefacts = artefacts;

        this.store.dispatch('imagedObject/setImagedObject', imagedObject);

        return imagedObject;
    }

    public async getImagedObjectArtefacts(editionId: number, imagedObject: ImagedObject): Promise<Artefact[]> {
        if (!imagedObject.recto) {
            console.error('ImagedObject ', imagedObject, ' has no recto information');
            throw new Error('ImagedObject has no recto information');
        }

        const response = await this.communicator.getImagedObject(
            `/v1/editions/${editionId}/imaged-objects/${imagedObject.id}?optional=artefacts&optional=masks`
        );

        let artefacts: Artefact[] = [];
        if (response.artefacts) {
            artefacts = response.artefacts.map((obj: any) => new Artefact(obj)).filter((a) => a.side === 'recto');
        };

        return artefacts;
    }

    public async createArtefact(editionId: number, imagedObject: ImagedObject, artefact: Artefact):
        Promise<ArtefactCreateResult> {
        const mask = artefact.mask ? artefact.mask.wkt : '';
        const createResponse = await this.communicator.request<ArtefactCreateResult>('addArtefact', {
            scroll_version_id: editionId,
            // id_of_sqe_image: artefact.sqeImageId, // TODO
            region_in_master_image: ''
        });

        artefact.id = createResponse.data.returned_info;
        const nameResponse = await this.changeArtefactName(editionId, imagedObject, artefact);
        const postResponse = await this.changeArtefactPosition(editionId, artefact);

        return Object.assign(createResponse.data, nameResponse, postResponse);
    }

    public async changeArtefactShape(editionId: number, imagedObject: ImagedObject, artefact: Artefact):
        Promise<ArtefactShapeChangedResult> {
        const mask = artefact.mask ? artefact.mask.wkt : '';
        const response = await this.communicator.request<ArtefactShapeChangedResult>('changeArtefactShape', {
            scroll_version_id: editionId,
            artefact_id: artefact.id,
            region_in_master_image: mask,
            // image_catalog_id: artefact.imageCatalogId, // TODO
            // id_of_sqe_image: artefact.sqeImageId,
        });
        return response.data;
    }

    public async changeArtefactPosition(editionId: number, artefact: Artefact):
        Promise<ArtefactPositionChangedResult> {
        const transformMatrix = artefact.transformMatrix ?
            artefact.transformMatrix :
            '{"matrix": [[1, 0, 0], [0, 1, 0]]}';
        const response = await this.communicator.request<ArtefactShapeChangedResult>('changeArtefactPosition', {
            scroll_version_id: editionId,
            artefact_id: artefact.id,
            transform_matrix: transformMatrix,
            z_index: null // I think z-index will be removed
        });
        return response.data;
    }

    public async changeArtefactName(editionId: number, fragment: ImagedObject, artefact: Artefact):
        Promise<ArtefactNameChangedResult> {
        const response = await this.communicator.request<ArtefactNameChangedResult>('changeArtefactData', {
            scroll_version_id: editionId,
            artefact_id: artefact.id,
            name: artefact.name
        });

        return response.data;
    }

    private _getCachedImagedObject(editionId: number, fragmentId: string): ImagedObject | undefined {
        // debugger // TODO: check this.store.state.edition.editionId after refresh
        if (!this.store.state.edition.editionId ||
            editionId !== this.store.state.edition.editionId.versionId) {
            return undefined;
        }
        if (!this.store.state.edition.imagedObjects) {
            return undefined;
        }

        return this.store.state.edition.imagedObjects.find((f: ImagedObject) => f.id === fragmentId);
    }

    private async _getImagedObject(editionId: number, imagedObjectId: string) {
        const editionService = new EditionService(this.store);
        const imagedObjects = await editionService.getEditionImagedObjects(editionId);

        return imagedObjects.find((io: ImagedObject) => io.id === imagedObjectId);
    }
}

export default ImagedObjectService;
