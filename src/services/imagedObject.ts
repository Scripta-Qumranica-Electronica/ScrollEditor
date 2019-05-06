import { Store } from 'vuex';
import { Communicator, NotFoundError, DictionaryListResults } from './communications';
import { ImagedObjectSimple } from '@/models/imagedObject';
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
        await this.fetchImagedObjectArtefacts(editionId, imagedObject);

        this.store.dispatch('fragment/setFragment', imagedObject);

        return imagedObject;
    }

    public async fetchImagedObjectArtefacts(editionId: number, imagedObject: ImagedObjectSimple): Promise<Artefact[]> {
        // The server does not have an endpoint that returns artefacts based on IDs,
        // so we need to use the getArtOfImage endpoint, passing the recto color image

        if (!imagedObject.recto) {
            console.error('ImagedObjectDetailed ', imagedObject, ' has no recto information');
            throw new Error('ImagedObjectDetailed has no recto information');
        }

        // getArtOfImage returns a list of dictionaries which is rather unclear.
        // So we don't bother adding a type to it, we just use what we see is returned
        // const response = await this.communicator.listRequest('getArtOfImage', {
        //     scroll_version_id: editionId,
        //     image_catalog_id: fragment.recto.imageCatalogId,
        // });

        const response = await this.communicator.getFragment(
            `/v1/edition/${editionId}/imaged-objects/${imagedObject.id}?optional=artefacts&optional=masks`
        );
        const artefacts = response.artefacts.map((obj: any) => new Artefact(obj));
        imagedObject.artefacts = artefacts;

        return artefacts;
    }

    public async createArtefact(editionId: number, imagedObject: ImagedObjectSimple, artefact: Artefact):
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

    public async changeArtefactShape(editionId: number, imagedObject: ImagedObjectSimple, artefact: Artefact):
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

    public async changeArtefactName(editionId: number, fragment: ImagedObjectSimple, artefact: Artefact):
        Promise<ArtefactNameChangedResult> {
        const response = await this.communicator.request<ArtefactNameChangedResult>('changeArtefactData', {
            scroll_version_id: editionId,
            artefact_id: artefact.id,
            name: artefact.name
        });

        return response.data;
    }

    private _getCachedImagedObject(editionId: number, fragmentId: string): ImagedObjectSimple | undefined {
        // debugger // TODO: check this.store.state.edition.editionId after refresh
        if (!this.store.state.edition.editionId ||
            editionId !== this.store.state.edition.editionId.versionId) {
            return undefined;
        }
        if (!this.store.state.edition.imagedObjects) {
            return undefined;
        }

        return this.store.state.edition.imagedObjects.find((f: ImagedObjectSimple) => f.id === fragmentId);
    }

    private async _getImagedObject(editionId: number, fragmentId: string) {
        const editionService = new EditionService(this.store);
        const fragments = await editionService.getEditionFragments(editionId);

        return fragments.find((f: ImagedObjectSimple) => f.id === fragmentId);
    }
}

export default ImagedObjectService;
