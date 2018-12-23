import { Store } from 'vuex';
import { Communicator, ServerError, NotFoundError } from './communications';
import { Fragment } from '@/models/fragment';
import ScrollService from './scroll';

class FragmentService {
    private communicator: Communicator;

    constructor(private store: Store<any>) {
        this.communicator = new Communicator(store);
    }

    public async fetchFragmentInfo(scrollVersionId: number, fragmentId: number) {
        let fragment = this._getCachedFragment(scrollVersionId, fragmentId);
        if (!fragment) {
            fragment = await this._getFragment(scrollVersionId, fragmentId);
        }

        if (!fragment) {
            throw new NotFoundError('fragment', fragmentId);
        }
        console.log('Setting fragment to ', fragment);
        this.store.dispatch('fragment/setFragment', fragment);

        return fragment;
    }

    /*private _getFragmentArtefacts(scrollVersionId: number, fragment: Fragment) : Artefact[] {

    } */

    private _getCachedFragment(scrollVersionId: number, fragmentId: number): Fragment | undefined {
        if (!this.store.state.scroll.scrollVersion ||
            scrollVersionId !== this.store.state.scroll.scrollVersion.versionId) {
            return undefined;
        }
        if (!this.store.state.scroll.fragments) {
            return undefined;
        }

        return this.store.state.scroll.fragments.find((f: Fragment) => f.id === fragmentId);
    }

    private async _getFragment(scrollVersionId: number, fragmentId: number) {
        const scrollService = new ScrollService(this.store);
        const fragments = await scrollService.getScrollVersionFragments(scrollVersionId);

        return fragments.find((f: Fragment) => f.id === fragmentId);
    }
}

export default FragmentService;
