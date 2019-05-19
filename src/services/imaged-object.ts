import { Store } from 'vuex';
import { Communicator, NotFoundError } from './communications';
import { ImagedObject } from '@/models/imaged-object';
import EditionService from './edition';
import { Artefact } from '@/models/artefact';
import { CommHelper } from './comm-helper';
import { ImagedObjectDTO } from '@/dtos/imaged-object';
import { UpdateArtefactDTO, ArtefactDTO, CreateArtefactDTO } from '@/dtos/artefact';

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
        }

        return artefacts;
    }

    public async createArtefact(editionId: number, artefactName: string):
        Promise<Artefact> {
        // const mask = artefact.mask ? artefact.mask.wkt : '';
        const body = {
            masterImageId: 1,
            mask: '',
            name: artefactName,
            position: '1'

        } as CreateArtefactDTO;
        const response = await CommHelper.post<ArtefactDTO>(`/v1/editions/${editionId}/artefacts`, body);

        const artefact = new Artefact(response.data);
        return artefact;
    }

    public async changeArtefactShape(editionId: number, imagedObject: ImagedObject, artefact: Artefact):
        Promise<ArtefactShapeChangedResult> {
        const mask = artefact.mask ? artefact.mask.wkt : '';
        const body = {
            mask,
            name: artefact.name,
            position: '1', // TODO: what is position?
        } as UpdateArtefactDTO;

        const response = await CommHelper.put<ArtefactDTO>(`/v1/editions/${editionId}/artefacts/${artefact.id}`, body);
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

    private _getCachedImagedObject(editionId: number, imagedObjectId: string): ImagedObject | undefined {
        if (!this.store.state.edition || editionId !== this.store.state.edition.id) {
            return undefined;
        }
        if (!this.store.state.edition.imagedObjects) {
            return undefined;
        }

        return this.store.state.edition.imagedObjects.find((io: ImagedObject) => io.id === imagedObjectId);
    }

    private async _getImagedObject(editionId: number, imagedObjectId: string) {
        const editionService = new EditionService(this.store);
        const imagedObjects = await editionService.getEditionImagedObjects(editionId);

        return imagedObjects.find((io: ImagedObject) => io.id === imagedObjectId);
    }
}

export default ImagedObjectService;
