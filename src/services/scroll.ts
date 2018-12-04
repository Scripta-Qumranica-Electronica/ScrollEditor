import { Store } from 'vuex';
import { Communicator, CopyCombinationResponse, ServerError } from './communications';
import { ScrollInfo, ScrollVersionInfo } from '@/models/scroll';

class ScrollService {
    private communicator: Communicator;
    constructor(private store: Store<any>) {
        this.communicator = new Communicator(this.store);
    }

    public async listScrolls(): Promise<ScrollInfo[]> {
        const response = await this.communicator.listRequest('listScrolls');

        const list = response.results.map((obj) => new ScrollInfo(obj));
        return list;
    }

    public async fetchScrollVersion(versionId: number, ignoreCache = false): Promise<ScrollVersionInfo> {
        // Fetches a scroll version from the server and puts it in the store.
        // Returns immediately if the requested scroll version is already in the store
        if (!ignoreCache &&
            this.store.state.scroll.scrollVersion &&
            this.store.state.scroll.scrollVersion.versionId === versionId) {
            return this.store.state.scroll.scrollVersion;
        }

        this.store.dispatch('scroll/setScrollVersion', null); // Trigget a spinner on all views

        const response = await this.communicator.listRequest('getScrollVersions', { scroll_version_id: versionId});

        const list = response.results.map((obj) => new ScrollVersionInfo(obj));

        // Convert the server response into a single ScrollVersionInfo entity, putting all the other versions
        // in its otherVersions array

        const primary = list.find((sv) => sv.versionId === versionId);
        if (!primary) {
            throw new ServerError( { error: 'Server did not return the version we asked for' } );
        }
        const others = list.filter((sv) => sv.versionId !== versionId);
        primary.otherVersions = others;

        this.store.dispatch('scroll/setScrollVersion', primary);
        return primary;
    }

    public async getMyScrollVersions(): Promise<ScrollVersionInfo[]> {
        const response = await this.communicator.listRequest('getMyScrollVersions');
        const list = response.results.map((obj) => new ScrollVersionInfo(obj));
        // for (var i = 0 ; i < list.length; i++) {
        //     list[i].shares.push(new ShareInfo({name: 'Talya', id: 133, can_write: true}));
        //     list[i].shares.push(new ShareInfo({name: 'Avi', id: 134, can_write: true}));
        //     list[i].shares.push(new ShareInfo({name: 'Benni', id: 135, can_Write: true}));
        // }
        return list;
    }

    public async copyScrollVersion(versionId: number): Promise<number> {
        const response = await this.communicator.request<CopyCombinationResponse>('copyCombination',
                        { scroll_version_id: versionId });
        return response.data.new_scroll_id;
    }

    public async renameScrollVersion(versionId: number, newName: string): Promise<void> {
        await this.communicator.request<any>('changeCombinationName', { scroll_version_id: versionId, name: newName });
    }
}

export default ScrollService;
