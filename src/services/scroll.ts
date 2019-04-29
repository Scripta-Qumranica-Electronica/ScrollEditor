import { Store } from 'vuex';
import { Communicator, CopyCombinationResponse, ServerError, ScrollVersions } from './communications';
import { ScrollInfo, ScrollVersionInfo, AllScrollVersion } from '@/models/scroll';
import { ImagedFragment } from '@/models/fragment';
import { Artefact } from '@/models/artefact';

class ScrollService {
    private communicator: Communicator;
    constructor(private store: Store<any>) {
        this.communicator = new Communicator(this.store);
    }

    public async listScrolls(): Promise<AllScrollVersion> {
        const response = await this.communicator.getList('api/v1/edition/list');
        const scrollList = [] as ScrollVersionInfo[];
        const myScrollList = [] as ScrollVersionInfo[];
        const self = this;
        response.result.map((obj) => { // group
            const publicCount = obj.filter((element: any) => element.isPublic);
            const myCount = obj.filter((element: any) =>
                element.owner.userId.toString() === self.store.state.session.userId);

            if (myCount.length) {
                myScrollList.push(new ScrollVersionInfo(myCount[0]));
                // TODO: add myCount.length or shares length ?
            }
            if (publicCount.length) {
                const scrollVersionInfo = new ScrollVersionInfo(publicCount[0]);
                scrollVersionInfo.publicCopies = publicCount.length; // update number of public scrolls
                scrollList.push(scrollVersionInfo);
            }
        });

        const allScrollVersion = {scrollList, myScrollList} as AllScrollVersion;
        return allScrollVersion;
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
        const response = await this.communicator.getScrollVersion(`/api/v1/edition/${versionId}`);

        // Convert the server response into a single ScrollVersionInfo entity, putting all the other versions
        // in its otherVersions array
        const primary = new ScrollVersionInfo(response.primary);
        if (!primary) {
            throw new ServerError( { error: 'Server did not return the version we asked for' } );
        }
        const others = response.others.map((obj) => new ScrollVersionInfo(obj));
        primary.otherVersions = others;

        this.store.dispatch('scroll/setScrollVersion', primary);
        return primary;
    }

    public async copyScrollVersion(versionId: number): Promise<number> {
        const response = await this.communicator.request<CopyCombinationResponse>('copyCombination',
            { scroll_version_id: versionId });
        return response.data.new_scroll_id;
    }

    public async renameScrollVersion(versionId: number, newName: string): Promise<void> {
        await this.communicator.request<any>('changeCombinationName', { scroll_version_id: versionId, name: newName });
    }

    public async fetchScrollVersionFragments(ignoreCache = false): Promise<ImagedFragment[]> {
        if (!ignoreCache && this.store.state.scroll.fragments !== null) {
            return this.store.state.scroll.fragments;
        }

        const fragments = await this.getScrollVersionFragments(this.store.state.scroll.scrollVersion.id);
        this.store.dispatch('scroll/setFragments', fragments);
        return fragments;
    }

    public async getScrollVersionFragments(scrollVersionId: number): Promise<ImagedFragment[]> {
        const response = await this.communicator.getList
        (`/api/v1/edition/${scrollVersionId}/imaged-objects`);

        const fragments = response.result.map((obj) => new ImagedFragment(obj));
        return fragments;
    }
}

export default ScrollService;
