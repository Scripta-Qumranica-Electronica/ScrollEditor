import { describe, it, expect, vi, beforeEach } from 'vitest';

// Unit test for artefact-image. The template renders <artefact-svg> with a bare
// <slot>/<g>/<path> once `loaded` is true, which crashes the compat renderer
// under happy-dom, so `visibleImageSettings` is exercised against a controlled
// `this`, and mounted() (which awaits the data-mixin then flips `loaded`) is
// driven through a real mount torn down before the loaded->render tick.

import { Artefact } from '@/models/artefact';
import ArtefactImage from '@/components/artefact/artefact-image.vue';
import { mountComponent } from './helpers/mount';

const opts: any = ArtefactImage;
const visibleGet = opts.computed.visibleImageSettings.get;

function makeArtefactDto(over: any = {}) {
    return {
        id: 42, name: 'frg', editionId: 100, imagedObjectId: 'IO-1', imageId: 1,
        artefactDataEditorId: 1,
        mask: 'POLYGON((0 0,100 0,100 200,0 200,0 0))',
        artefactMaskEditorId: 1, isPlaced: true,
        placement: { scale: 1, rotate: 0, translate: { x: 0, y: 0 }, zIndex: 0, mirrored: false },
        artefactPlacementEditorId: 1, side: 'recto', statusMessage: '',
        ...over,
    };
}

describe('artefact-image', () => {
    beforeEach(() => vi.clearAllMocks());

    it('visibleImageSettings is empty for a virtual artefact', () => {
        const ctx: any = { artefact: { isVirtual: true }, imageSettings: {} };
        expect(visibleGet.call(ctx)).toEqual([]);
    });

    it('visibleImageSettings falls back to the master image when no settings given', () => {
        const master = { url: 'm' };
        const ctx: any = {
            artefact: { isVirtual: false },
            imageSettings: {},
            imageStack: { master },
        };
        const result = visibleGet.call(ctx);
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({ image: master, type: 'master', visible: true, opacity: 1, normalizedOpacity: 1 });
    });

    it('visibleImageSettings returns only the visible settings when provided', () => {
        const a = { image: { url: 'a' }, type: 'a', visible: true, opacity: 1, normalizedOpacity: 1 };
        const b = { image: { url: 'b' }, type: 'b', visible: false, opacity: 1, normalizedOpacity: 1 };
        const ctx: any = {
            artefact: { isVirtual: false },
            imageSettings: { a, b },
        };
        const result = visibleGet.call(ctx);
        expect(result).toEqual([a]);
    });

    it('mounted() awaits the data mixin and flips loaded to true', async () => {
        const artefact = new Artefact(makeArtefactDto());
        artefact.imageStack = {
            master: { manifest: { width: 1000, height: 2000, sizes: [] }, getOptimizedScaleFactor: vi.fn().mockReturnValue(1) },
        } as any;
        const state = {
            prepare: {
                imageManifest: vi.fn().mockResolvedValue(undefined),
                artefactMask: vi.fn().mockResolvedValue(undefined),
            },
            imagedObjects: { find: vi.fn() },
        };

        const w = mountComponent(ArtefactImage, {
            props: { artefact },
            state,
            stubs: { 'artefact-svg': true, 'iiif-image': true },
        });

        await (w.vm as any).mountedDone;
        await (w.vm as any).$nextTick();
        expect((w.vm as any).loaded).toBe(true);
        expect(state.prepare.imageManifest).toHaveBeenCalledTimes(1);
        w.unmount();
    });
});
