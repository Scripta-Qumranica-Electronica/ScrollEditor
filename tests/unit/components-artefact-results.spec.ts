import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/search', () => ({ default: class {} }));
// artefact-image pulls in heavy IIIF/canvas deps; stub the whole module.
vi.mock('@/components/artefact/artefact-image.vue', () => ({ default: { name: 'artefact-image', render: () => null } }));

import ArtefactResults from '@/views/search/artefact-results.vue';
import { mountComponent } from './helpers/mount';

const edition = {
    id: 10,
    name: 'Edition Ten',
    metrics: { ppi: 1215, width: 1, height: 1, xOrigin: 0, yOrigin: 0 },
};

function makeState(findResult: any = edition) {
    return {
        editions: { find: vi.fn().mockReturnValue(findResult) },
        prepare: { allEditions: vi.fn().mockResolvedValue(undefined) },
    };
}

function artDto(over: any = {}) {
    return {
        id: 100,
        editionId: 10,
        name: 'Art A',
        side: 'recto',
        imagedObjectId: 'IO-1',
        mask: '',
        isPlaced: false,
        placement: { scale: 1, rotate: 0, translate: { x: 0, y: 0 }, zIndex: 0 },
        url: 'http://img/master',
        ppi: 1215,
        imageManifest: '',
        ...over,
    };
}

function mountResults(props: any, state: any = makeState()) {
    return mountComponent(ArtefactResults, {
        props,
        state,
        stubs: {
            'b-collapse': true, 'b-card': true, 'router-link': true, 'artefact-image': true,
        },
    });
}

describe('artefact-results', () => {
    beforeEach(() => vi.clearAllMocks());

    it('mounted prepares all editions and flips ready', async () => {
        const state = makeState();
        const w = mountResults({ artefacts: null }, state);
        await w.vm.$nextTick();
        expect(state.prepare.allEditions).toHaveBeenCalled();
        expect(w.vm.ready).toBe(true);
    });

    it('artefactsWithEditions is empty when the prop is null', () => {
        const w = mountResults({ artefacts: null });
        expect(w.vm.artefactsWithEditions).toEqual([]);
        expect(w.vm.title).toBe('Artefacts (0)');
    });

    it('builds artefact+edition+imagedObject entries for matching editions', () => {
        const w = mountResults({ artefacts: [artDto()] });
        const rows = w.vm.artefactsWithEditions;
        expect(rows.length).toBe(1);
        expect(rows[0].artefact.id).toBe(100);
        expect(rows[0].edition.id).toBe(10);
        expect(rows[0].imagedObject).toBeTruthy();
        expect(w.vm.title).toBe('Artefacts (1)');
    });

    it('skips artefacts whose edition is not found in state', () => {
        const state = makeState(null); // find() returns null -> edition not found
        const w = mountResults({ artefacts: [artDto()] }, state);
        expect(w.vm.artefactsWithEditions).toEqual([]);
    });

    it('createImagedObjectDTO warns and returns undefined when the dto has no url', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        const w = mountResults({ artefacts: null });
        expect(w.vm.createImagedObjectDTO(artDto({ url: undefined }))).toBeUndefined();
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
    });

    it('createImagedObjectDTO builds recto+verso stacks from a single url', () => {
        const w = mountResults({ artefacts: null });
        const dto = w.vm.createImagedObjectDTO(artDto());
        expect(dto).toBeTruthy();
        expect(dto.recto.images[0].side).toBe('recto');
        expect(dto.verso.images[0].side).toBe('verso');
        expect(dto.recto.images[0].url).toBe('http://img/master');
    });

    it('an artefact with no url yields an entry with undefined imagedObject', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        const w = mountResults({ artefacts: [artDto({ url: undefined })] });
        const rows = w.vm.artefactsWithEditions;
        expect(rows.length).toBe(1);
        expect(rows[0].imagedObject).toBeUndefined();
        warn.mockRestore();
    });
});
