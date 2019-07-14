import { ImagedObject } from '@/models/imaged-object';
import EditionService from './edition';
import { Artefact } from '@/models/artefact';
import { CommHelper } from './comm-helper';
import { ImagedObjectDTO } from '@/dtos/imaged-object';
import { UpdateArtefactDTO, ArtefactDTO, CreateArtefactDTO } from '@/dtos/artefact';
import { StateManager } from '@/state';
import { OptimizedArtefact } from '@/views/imaged-object-editor/types';

class ImagedObjectService {
    public stateManager: StateManager;
    constructor() {
        this.stateManager = StateManager.instance;
    }

    public async fetchImagedObjectInfo(editionId: number, imagedObjectId: string) {
        let imagedObject = this._getCachedImagedObject(editionId, imagedObjectId);
        if (!imagedObject) {
            imagedObject = await this._getImagedObject(editionId, imagedObjectId);
        }

        if (!imagedObject) {
            throw new Error(`Can't find imagedObject with id ${imagedObjectId}`);
        }
        const artefacts = await this.getImagedObjectArtefacts(editionId, imagedObject);
        imagedObject.artefacts = artefacts;

        this.stateManager.imagedObjects.current = imagedObject;

        return imagedObject;
    }

    public async getImagedObjectArtefacts(editionId: number, imagedObject: ImagedObject): Promise<Artefact[]> {
        if (!imagedObject.recto) {
            console.error('ImagedObject ', imagedObject, ' has no recto information');
            throw new Error('ImagedObject has no recto information');
        }

        const response = await CommHelper.get<ImagedObjectDTO>(
            `/v1/editions/${editionId}/imaged-objects/${imagedObject.id}?optional=artefacts&optional=masks`
        );

        let artefacts: Artefact[] = [];
        if (response.data.artefacts) {
            artefacts = response.data.artefacts.map((obj: any) => new Artefact(obj)).filter((a) => a.side === 'recto');
        }

        return artefacts;
    }

    public async createArtefact(editionId: number, imagedObject: ImagedObject, artefactName: string):
        Promise<Artefact> {
        // const mask = artefact.mask ? artefact.mask.wkt : '';
        let masterImageId = 0;
        imagedObject.recto!.images.forEach((element) => {
            if (element.master) {
                masterImageId = element.id;
            }
        });
        const body = {
            masterImageId,
            mask: '',
            name: artefactName
        } as CreateArtefactDTO;
        const response = await CommHelper.post<ArtefactDTO>(`/v1/editions/${editionId}/artefacts`, body);

        const artefact = new Artefact(response.data);
        return artefact;
    }

    public async deleteArtefact(art: OptimizedArtefact) {
        await CommHelper.delete(`/v1/editions/${art.editionId}/artefacts/${art.id}`);
    }

    public async changeArtefact(editionId: number, artefact: Artefact):
        Promise<ArtefactDTO> {
        const mask = artefact.mask ? artefact.mask.polygon.wkt : '';
        const body = {
            mask,
            name: artefact.name,
        } as UpdateArtefactDTO;

        const response = await CommHelper.put<ArtefactDTO>(`/v1/editions/${editionId}/artefacts/${artefact.id}`, body);
        return response.data;
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
        const imagedObjects = await editionService.getEditionImagedObjects(editionId);

        return imagedObjects.find((io: ImagedObject) => io.id === imagedObjectId);
    }
}

export default ImagedObjectService;
