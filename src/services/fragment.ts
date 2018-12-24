import { Store } from 'vuex';
import { Communicator, NotFoundError, DictionaryListResults } from './communications';
import { Fragment } from '@/models/fragment';
import ScrollService from './scroll';
import { Artefact } from '@/models/artefact';

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
        await this.fetchFragmentArtefacts(scrollVersionId, fragment);

        console.log('Setting fragment to ', fragment);
        this.store.dispatch('fragment/setFragment', fragment);

        return fragment;
    }

    public async fetchFragmentArtefacts(scrollVersionId: number, fragment: Fragment): Promise<Artefact[]> {
        // The server does not have an endpoint that returns artefacts based on IDs,
        // so we need to use the getArtOfImage endpoint, passing the recto color image

        if (!fragment.recto) {
            console.error('Fragment ', fragment, ' has no recto information');
            throw new Error('Fragment has no recto information');
        }

        // getArtOfImage returns a list of dictionaries which is rather unclear.
        // So we don't bother adding a type to it, we just use what we see is returned
        const response = await this.communicator.listRequest('getArtOfImage', {
            scroll_version_id: scrollVersionId,
            image_catalog_id: fragment.recto.imageCatalogId,
        });

        const artefacts = response.results.map((obj) => new Artefact(obj));
        fragment.artefacts = artefacts;

        return artefacts;
    }

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