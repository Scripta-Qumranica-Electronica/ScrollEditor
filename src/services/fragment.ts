import { Store } from 'vuex';
import { Communicator, NotFoundError, DictionaryListResults } from './communications';
import { ImagedFragment } from '@/models/fragment';
import ScrollService from './scroll';
import { Artefact } from '@/models/artefact';

export interface ArtefactCreateResult {
    returned_info: number;
}
export interface ArtefactShapeChangedResult {
}
export interface ArtefactPositionChangedResult {
}
export interface ArtefactNameChangedResult {
}

class FragmentService {
    private communicator: Communicator;

    constructor(private store: Store<any>) {
        this.communicator = new Communicator(store);
    }

    public async fetchFragmentInfo(scrollVersionId: number, fragmentId: string) {
        let fragment = this._getCachedFragment(scrollVersionId, fragmentId);
        if (!fragment) {
            fragment = await this._getFragment(scrollVersionId, fragmentId);
        }

        if (!fragment) {
            throw new NotFoundError('fragment', fragmentId);
        }
        await this.fetchFragmentArtefacts(scrollVersionId, fragment);

        this.store.dispatch('fragment/setFragment', fragment);

        return fragment;
    }

    public async fetchFragmentArtefacts(scrollVersionId: number, fragment: ImagedFragment): Promise<Artefact[]> {
        // The server does not have an endpoint that returns artefacts based on IDs,
        // so we need to use the getArtOfImage endpoint, passing the recto color image

        if (!fragment.recto) {
            console.error('Fragment ', fragment, ' has no recto information');
            throw new Error('Fragment has no recto information');
        }

        // getArtOfImage returns a list of dictionaries which is rather unclear.
        // So we don't bother adding a type to it, we just use what we see is returned
        // const response = await this.communicator.listRequest('getArtOfImage', {
        //     scroll_version_id: scrollVersionId,
        //     image_catalog_id: fragment.recto.imageCatalogId,
        // });

        const response = await this.communicator.getFragment(`/v1/edition/${scrollVersionId}/${fragment.id}`);
        const artefacts = response.artefacts.map((obj: any) => new Artefact(obj));
        fragment.artefacts = artefacts;

        return artefacts;
    }

    public async createFragmentArtefact(scrollVersionId: number, fragment: ImagedFragment, artefact: Artefact):
        Promise<ArtefactCreateResult> {
        const mask = artefact.mask ? artefact.mask.wkt : '';
        const createResponse = await this.communicator.request<ArtefactCreateResult>('addArtefact', {
            scroll_version_id: scrollVersionId,
            // id_of_sqe_image: artefact.sqeImageId, // TODO
            region_in_master_image: ''
        });

        artefact.id = createResponse.data.returned_info;
        const nameResponse = await this.changeFragmentArtefactName(scrollVersionId, fragment, artefact);
        const postResponse = await this.changeFragmentArtefactPosition(scrollVersionId, artefact);

        return Object.assign(createResponse.data, nameResponse, postResponse);
    }

    public async changeFragmentArtefactShape(scrollVersionId: number, fragment: ImagedFragment, artefact: Artefact):
        Promise<ArtefactShapeChangedResult> {
        const mask = artefact.mask ? artefact.mask.wkt : '';
        const response = await this.communicator.request<ArtefactShapeChangedResult>('changeArtefactShape', {
            scroll_version_id: scrollVersionId,
            artefact_id: artefact.id,
            region_in_master_image: mask,
            // image_catalog_id: artefact.imageCatalogId, // TODO
            // id_of_sqe_image: artefact.sqeImageId,
        });
        return response.data;
    }

    public async changeFragmentArtefactPosition(scrollVersionId: number, artefact: Artefact):
        Promise<ArtefactPositionChangedResult> {
        const transformMatrix = artefact.transformMatrix ?
            artefact.transformMatrix :
            '{"matrix": [[1, 0, 0], [0, 1, 0]]}';
        const response = await this.communicator.request<ArtefactShapeChangedResult>('changeArtefactPosition', {
            scroll_version_id: scrollVersionId,
            artefact_id: artefact.id,
            transform_matrix: transformMatrix,
            z_index: null // I think z-index will be removed
        });
        return response.data;
    }

    public async changeFragmentArtefactName(scrollVersionId: number, fragment: ImagedFragment, artefact: Artefact):
        Promise<ArtefactNameChangedResult> {
        const response = await this.communicator.request<ArtefactNameChangedResult>('changeArtefactData', {
            scroll_version_id: scrollVersionId,
            artefact_id: artefact.id,
            name: artefact.name
        });

        return response.data;
    }

    private _getCachedFragment(scrollVersionId: number, fragmentId: string): ImagedFragment | undefined {
        // debugger // TODO: check this.store.state.scroll.scrollVersion after refresh
        if (!this.store.state.scroll.scrollVersion ||
            scrollVersionId !== this.store.state.scroll.scrollVersion.versionId) {
            return undefined;
        }
        if (!this.store.state.scroll.fragments) {
            return undefined;
        }

        return this.store.state.scroll.fragments.find((f: ImagedFragment) => f.id === fragmentId);
    }

    private async _getFragment(scrollVersionId: number, fragmentId: string) {
        const scrollService = new ScrollService(this.store);
        const fragments = await scrollService.getScrollVersionFragments(scrollVersionId);

        return fragments.find((f: ImagedFragment) => f.id === fragmentId);
    }
}

export default FragmentService;
