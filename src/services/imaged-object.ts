import { ImagedObject } from '@/models/imaged-object';
import EditionService from './edition';
import { Artefact } from '@/models/artefact';
import { CommHelper } from './comm-helper';
import { ImagedObjectDTO } from '@/dtos/sqe-dtos';
import { UpdateArtefactDTO, ArtefactDTO, CreateArtefactDTO } from '@/dtos/sqe-dtos';
import { StateManager } from '@/state';
import { OptimizedArtefact } from '@/views/imaged-object-editor/types';
import { Side } from '@/models/misc';
import {baseUrl, editions, imagedObjects, artefacts} from '@/variables';

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
        const artefactList = await this.getImagedObjectArtefacts(editionId, imagedObject);
        imagedObject.artefacts = artefactList;

        this.stateManager.imagedObjects.current = imagedObject;

        return imagedObject;
    }

    public async getImagedObjectArtefacts(editionId: number, imagedObject: ImagedObject): Promise<Artefact[]> {
        const response = await CommHelper.get<ImagedObjectDTO>(
            `/${baseUrl}/${editions}/${editionId}/${imagedObjects}/${imagedObject.id}?optional=artefacts&optional=masks`
        );

        let artefactList: Artefact[] = [];
        if (response.data.artefacts) {
            artefactList = response.data.artefacts.map((obj: any) => new Artefact(obj));
        }

        return artefactList;
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
        const response = await CommHelper.post<ArtefactDTO>(`/${baseUrl}/${editions}/${editionId}/${artefacts}`, body);

        const artefact = new Artefact(response.data);
        return artefact;
    }

    public async deleteArtefact(art: OptimizedArtefact) {
        await CommHelper.delete(`/${baseUrl}/${editions}/${art.editionId}/${artefacts}/${art.id}`);
    }

    public async changeArtefact(editionId: number, artefact: Artefact):
        Promise<ArtefactDTO> {
        const mask = artefact.mask ? artefact.mask.polygon.wkt : '';
        const body = {
            mask,
            name: artefact.name,
        } as UpdateArtefactDTO;

        const response = await CommHelper.put<ArtefactDTO>
        (`/${baseUrl}/${editions}/${editionId}/${artefacts}/${artefact.id}`, body);
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
        const imagedObjectList = await editionService.getEditionImagedObjects(editionId);

        return imagedObjectList.find((io: ImagedObject) => io.id === imagedObjectId);
    }
}

export default ImagedObjectService;
