import { Store } from 'vuex';
import { Communicator, CopyCombinationResponse, ServerError, Editions } from './communications';
import { EditionInfo, AllEditions } from '@/models/edition';
import { ImagedObjectSimple } from '@/models/imagedObject';
import { Artefact } from '@/models/artefact';

class EditionService {
    private communicator: Communicator;
    constructor(private store: Store<any>) {
        this.communicator = new Communicator(this.store);
    }

    public async listEditions(): Promise<AllEditions> {
        const response = await this.communicator.getList('/v1/editions');
        const editionList = [] as EditionInfo[];
        const myEditionList = [] as EditionInfo[];
        const self = this;
        response.result.map((obj) => { // group
            const publicCount = obj.filter((element: any) => element.isPublic);
            const myCount = obj.filter((element: any) =>
                element.owner.userId.toString() === self.store.state.session.userId);

            if (myCount.length) {
                myEditionList.push(new EditionInfo(myCount[0]));
                // TODO: add myCount.length or shares length ?
            }
            if (publicCount.length) {
                const editionInfo = new EditionInfo(publicCount[0]);
                editionInfo.publicCopies = publicCount.length; // update number of public scrolls
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
        const response = await this.communicator.getEdition(`/v1/editions/${editionId}`);

        // Convert the server response into a single EditionInfo entity, putting all the other versions
        // in its otherVersions array
        const primary = new EditionInfo(response.primary);
        if (!primary) {
            throw new ServerError( { error: 'Server did not return the version we asked for' } );
        }
        const others = response.others.map((obj) => new EditionInfo(obj));
        primary.otherVersions = others;

        this.store.dispatch('edition/setEditionId', primary);
        return primary;
    }

    public async copyEdition(editionId: number, name: string | undefined): Promise<number> {
        const response = await this.communicator.copyEdition(`/v1/editions/${editionId}`, name);
        return response.id;
    }

    public async renameEdition(editionId: number, newName: string): Promise<void> {
        await this.communicator.renameEdition(`/v1/editions/${editionId}`, newName);
    }

    public async fetchEditionFragments(ignoreCache = false): Promise<ImagedObjectSimple[]> {
        if (!ignoreCache && this.store.state.edition.imagedObjects !== null) {
            return this.store.state.edition.imagedObjects;
        }

        const fragments = await this.getEditionFragments(this.store.state.edition.editionId.id);
        this.store.dispatch('edition/setFragments', fragments);
        return fragments;
    }

    public async getEditionFragments(editionId: number): Promise<ImagedObjectSimple[]> {
        const response = await this.communicator.getList
        (`/v1/editions/${editionId}/imaged-objects?optional=artefacts`);

        return response.result.map((obj) => new ImagedObjectSimple(obj));
    }
}

export default EditionService;
