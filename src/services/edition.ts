import { Store } from 'vuex';
import { Communicator, ServerError } from './communications';
import { EditionInfo, AllEditions } from '@/models/edition';
import { ImagedObject } from '@/models/imaged-object';
import { CommHelper } from './comm-helper';
import { EditionListDTO, EditionGroupDTO, EditionCopyRequestDTO, EditionDTO } from '@/dtos/editions';
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
            this.store.state.edition &&
            this.store.state.edition.id === editionId) {
            return this.store.state.edition;
        }

        this.store.dispatch('edition/setEdition', null); // Trigger a spinner on all views
        const response = await CommHelper.get<EditionGroupDTO>(`/v1/editions/${editionId}`);

        // Convert the server response into a single EditionInfo entity, putting all the other versions
        // in its otherVersions array
        const primary = new EditionInfo(response.data.primary);
        if (!primary) {
            throw new ServerError( { error: 'Server did not return the version we asked for' } );
        }
        const others = response.data.others.map((obj) => new EditionInfo(obj));
        primary.otherVersions = others;

        this.store.dispatch('edition/setEdition', primary, { root: true });
        return primary;
    }

    public async fetchEditionImagedObjects(ignoreCache = false): Promise<ImagedObject[]> {
        console.log('fetchEditionImagedObject called');
        if (!ignoreCache && this.store.state.edition.imagedObjects !== null) {
            console.log('Returning cached list ', this.store.state.edition.imagedObjects);
            return this.store.state.edition.imagedObjects;
        }

        console.log('Loading imaged objects from server');
        const imagedObjects = await this.getEditionImagedObjects(this.store.state.edition.current.id);
        console.log('Imaged objects are: ', imagedObjects);
        this.store.dispatch('edition/setImagedObjects', imagedObjects, { root: true });
        return imagedObjects;
    }

    public async getEditionImagedObjects(editionId: number): Promise<ImagedObject[]> {
        const response = await CommHelper.get<ImagedObjectListDTO>(
            `/v1/editions/${editionId}/imaged-objects?optional=artefacts&optional=masks`
        );

        console.log('Imaged objects DTOs are ', response.data);
        return response.data.imagedObjects.map((d: any) => new ImagedObject(d));
    }

    public async copyEdition(editionId: number, name: string): Promise<EditionInfo> {
        const dto = {
            name
        } as EditionCopyRequestDTO;
        const response = await CommHelper.post<EditionDTO>(`/v1/editions/${editionId}`, dto);

        const newEdition = new EditionInfo(response.data);
        return newEdition;
    }

}

export default EditionService;
