import { Store } from 'vuex';
import { Communicator, ListResults, CopyCombinationResponse } from './communications';
import { Scroll, ScrollVersionInfo } from '@/models/scroll';

class ScrollService {
    private communicator: Communicator;
    constructor(private store: Store<any>) {
        this.communicator = new Communicator(this.store);
    }

    public async listScrolls(): Promise<Scroll[]> {
        const response = await this.communicator.listRequest('listScrolls');

        const list = response.results.map((obj) => new Scroll(obj));
        return list;
    }

    public async getScrollVersions(versionId: number): Promise<ScrollVersionInfo[]> {
        const response = await this.communicator.listRequest('getScrollVersions', { scroll_version_id: versionId});

        const list = response.results.map((obj) => new ScrollVersionInfo(obj));
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
