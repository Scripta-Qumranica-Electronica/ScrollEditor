import { EditionInfo, AllEditions } from '@/models/edition';
import { ImagedObject } from '@/models/imaged-object';
import { CommHelper } from './comm-helper';
import { EditionListDTO, EditionGroupDTO, EditionUpdateRequestDTO, EditionDTO } from '@/dtos/sqe-dtos';
import { ImagedObjectListDTO } from '@/dtos/sqe-dtos';
import { StateManager } from '@/state';
import { Artefact } from '@/models/artefact';
import { ArtefactListDTO } from '@/dtos/sqe-dtos';

class EditionService {
    public stateManager: StateManager;

    constructor() {
        this.stateManager = StateManager.instance;
    }

    public async listEditions(): Promise<AllEditions> {
        const response = await CommHelper.get<EditionListDTO>('/v1/editions');
        const editionList = [] as EditionInfo[];
        const myEditionList = [] as EditionInfo[];
        const self = this;

        response.data.editions.map((obj) => { // group
            const publicEditions = obj.filter((element: any) => element.isPublic);

            if (StateManager.instance.session.user) {
                const myEditions = obj.filter((element: any) =>
                    element.owner.userId === self.stateManager.session.user!.userId);

                if (myEditions.length) {
                    myEditionList.push(new EditionInfo(myEditions[0]));
                    // TODO: add myCount.length or shares length ?
                }
            }
            if (publicEditions.length) {
                const editionInfo = new EditionInfo(publicEditions[0]);
                editionInfo.publicCopies = publicEditions.length; // update number of public scrolls
                editionList.push(editionInfo);
            }
        });

        return {editionList, myEditionList} as AllEditions;
    }

    public async fetchEdition(editionId: number, ignoreCache = false): Promise<EditionInfo> {
        // Fetches a edition version from the server and puts it in the store.
        // Returns immediately if the requested edition version is already in the store
        if (!ignoreCache &&
            this.stateManager.editions.current &&
            this.stateManager.editions.current.id === editionId) {
            return this.stateManager.editions.current;
        }

        this.stateManager.editions.current = undefined; // Trigger a spinner on all views
        const response = await CommHelper.get<EditionGroupDTO>(`/v1/editions/${editionId}`);

        // Convert the server response into a single EditionInfo entity, putting all the other versions
        // in its otherVersions array
        const primary = new EditionInfo(response.data.primary);
        if (!primary) {
            throw new Error('Server did not return the version we asked for');
        }
        const others = response.data.others.map((obj) => new EditionInfo(obj));
        primary.otherVersions = others;

        this.stateManager.editions.current = primary;
        return primary;
    }

    public async fetchEditionImagedObjects(ignoreCache = false): Promise<ImagedObject[]> {
        if (!ignoreCache && this.stateManager.imagedObjects.items !== undefined) {
            return this.stateManager.imagedObjects.items;
        }

        const imagedObjects = await this.getEditionImagedObjects(this.stateManager.editions.current!.id);
        this.stateManager.imagedObjects.items = imagedObjects;
        return imagedObjects;
    }

    public async fetchArtefacts(ignoreCache = false): Promise<Artefact[]> {
        if (!ignoreCache && this.stateManager.artefacts.items !== undefined) {
            return this.stateManager.artefacts.items;
        }

        const artefacts = await this.getEditionArtefacts(this.stateManager.editions.current!.id);
        this.stateManager.artefacts.items = artefacts;
        return artefacts;
    }

    public async getEditionImagedObjects(editionId: number): Promise<ImagedObject[]> {
        const response = await CommHelper.get<ImagedObjectListDTO>(
            `/v1/editions/${editionId}/imaged-objects?optional=artefacts&optional=masks`
        );

        return response.data.imagedObjects.map((d: any) => new ImagedObject(d));
    }

    public async getEditionArtefacts(editionId: number): Promise<Artefact[]> {
        const response = await CommHelper.get<ArtefactListDTO>(
            `/v1/editions/${editionId}/artefacts?optional=artefacts&optional=masks`
        );

        return response.data.artefacts.map((d: any) => new Artefact(d));
    }

    public async copyEdition(editionId: number, name: string): Promise<EditionInfo> {
        const dto = {
            name
        } as EditionUpdateRequestDTO;
        const response = await CommHelper.post<EditionDTO>(`/v1/editions/${editionId}`, dto);

        const newEdition = new EditionInfo(response.data);
        return newEdition;
    }

}

export default EditionService;
