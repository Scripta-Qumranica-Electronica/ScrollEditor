import { Store } from 'vuex';
import { Communicator, CopyCombinationResponse, ServerError, Editions } from './communications';
import { EditionInfo, AllEditions } from '@/models/edition';
import { ImagedObject } from '@/models/imaged-object';
import { Artefact } from '@/models/artefact';
import { CommHelper } from './comm-helper';
import { EditionListDTO, EditionGroupDTO } from '@/dtos/editions';
import { ImagedObjectListDTO } from '@/dtos/imaged-object';

class EditionService {
    private communicator: Communicator;
    constructor(private store: Store<any>) {
        this.communicator = new Communicator(this.store);
    }

    public async listEditions(): Promise<AllEditions> {
        const response = await CommHelper.get<EditionListDTO>('/v1/editions');
        const editionList = [] as EditionInfo[];
        const myEditionList = [] as EditionInfo[];
        const self = this;

        response.data.editions.map((obj) => { // group
            const publicEditions = obj.filter((element: any) => element.isPublic);
            const myEditions = obj.filter((element: any) =>
                element.owner.userId.toString() === self.store.state.session.userId);

            if (myEditions.length) {
                myEditionList.push(new EditionInfo(myEditions[0]));
                // TODO: add myCount.length or shares length ?
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
            this.store.state.edition.editionId &&
            this.store.state.edition.editionId.versionId === editionId) {
            return this.store.state.edition.editionId;
        }

        this.store.dispatch('edition/setEditionId', null); // Trigger a spinner on all views
        const response = await CommHelper.get<EditionGroupDTO>(`/v1/editions/${editionId}`);

        // Convert the server response into a single EditionInfo entity, putting all the other versions
        // in its otherVersions array
        const primary = new EditionInfo(response.data.primary);
        if (!primary) {
            throw new ServerError( { error: 'Server did not return the version we asked for' } );
        }
        const others = response.data.others.map((obj) => new EditionInfo(obj));
        primary.otherVersions = others;

        this.store.dispatch('edition/setEditionId', primary);
        return primary;
    }

    public async copyEdition(editionId: number, name: string | undefined): Promise<number> {
        const response = await this.communicator.copyEdition(`/v1/editions/${editionId}`, name);
        return response.id;
    }

    public async fetchEditionImagedObjects(ignoreCache = false): Promise<ImagedObject[]> {
        if (!ignoreCache && this.store.state.edition.imagedObjects !== null) {
            return this.store.state.edition.imagedObjects;
        }

        const imagedObjects = await this.getEditionImagedObjects(this.store.state.edition.editionId.id);
        this.store.dispatch('edition/setImagedObject', imagedObjects);
        return imagedObjects;
    }

    public async getEditionImagedObjects(editionId: number): Promise<ImagedObject[]> {
        const response = await CommHelper.get<ImagedObjectListDTO>(
            `/v1/editions/${editionId}/imaged-objects?optional=artefacts&optional=masks`
        );

        return response.data.imagedObjects.map((d) => new ImagedObject(d));
    }
}

export default EditionService;
