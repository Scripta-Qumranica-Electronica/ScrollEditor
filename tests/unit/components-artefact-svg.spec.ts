import { describe, it, expect, vi, beforeEach } from 'vitest';

// Unit test for artefact-svg. The template renders a bare <slot> inside the clipped
// <g> once `loaded` is true, which crashes the compat renderer under happy-dom, so
// the scale/elementHeight computeds and updateWidth are exercised against a
// controlled `this` (via the component options). asyncMounted (from the data mixin)
// is driven through a real mount that is torn down before the loaded->render tick.

import { Artefact } from '@/models/artefact';
import { BoundingBox } from '@/utils/helpers';
import ArtefactSvg from '@/components/artefact/artefact-svg.vue';
import { mountComponent } from './helpers/mount';

const opts: any = ArtefactSvg;
const scaleGet = opts.computed.scale.get;
const elementHeightGet = opts.computed.elementHeight.get;
const updateWidth = opts.methods.updateWidth;

function makeArtefactDto(over: any = {}) {
    return {
        id: 42,
        name: 'frg',
        editionId: 100,
        imagedObjectId: 'IO-1',
        imageId: 1,
        artefactDataEditorId: 1,
        mask: 'POLYGON((0 0,100 0,100 200,0 200,0 0))',
        artefactMaskEditorId: 1,
        isPlaced: true,
        placement: { scale: 1, rotate: 0, translate: { x: 0, y: 0 }, zIndex: 0, mirrored: false },
        artefactPlacementEditorId: 1,
        side: 'recto',
        statusMessage: '',
        ...over,
    };
}

function makeStack(getScale = vi.fn().mockReturnValue(7)) {
    return {
        master: {
            manifest: { width: 1000, height: 2000, sizes: [] },
            getOptimizedScaleFactor: getScale,
        },
    };
}

describe('artefact-svg', () => {
    beforeEach(() => vi.clearAllMocks());

    it('scale falls back to 0.05 without width/manifest and reflects width otherwise', () => {
        // no width -> fallback
        expect(scaleGet.call({ elementWidth: 0, masterImageManifest: null })).toBe(0.05);
        // width but no manifest -> fallback
        expect(scaleGet.call({ elementWidth: 300, masterImageManifest: null })).toBe(0.05);
        // width + manifest -> elementWidth / boundingBox.width
        expect(scaleGet.call({
            elementWidth: 300,
            masterImageManifest: {},
            boundingBox: new BoundingBox(0, 0, 150, 100),
        })).toBe(2);
    });

    it('elementHeight uses the aspect ratio when a width is set, else 100', () => {
        expect(elementHeightGet.call({ elementWidth: 0 })).toBe(100);
        expect(elementHeightGet.call({ elementWidth: 260, aspectRatio: 1.3 })).toBe(200);
    });

    it('updateWidth warns and resets serverScale when called before load', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        const ctx: any = { $el: { clientWidth: 0 }, loaded: false, serverScale: 99 };
        updateWidth.call(ctx);
        expect(warn).toHaveBeenCalled();
        expect(ctx.serverScale).toBe(5);
        warn.mockRestore();
    });

    it('updateWidth asks the master image for an optimized scale factor when loaded', () => {
        const getScale = vi.fn().mockReturnValue(7);
        const ctx: any = {
            $el: { clientWidth: 400 },
            loaded: true,
            aspectRatio: 1.3,
            boundingBox: new BoundingBox(0, 0, 150, 100),
            imageStack: makeStack(getScale),
            serverScale: 5,
        };
        updateWidth.call(ctx);
        expect(ctx.elementWidth).toBe(400);
        expect(getScale).toHaveBeenCalledWith(400, 400 / 1.3, ctx.boundingBox);
        expect(ctx.serverScale).toBe(7);
    });

    it('asyncMounted (data mixin) loads the manifest+mask and derives the bounding box', async () => {
        const artefact = new Artefact(makeArtefactDto());
        artefact.imageStack = makeStack() as any;
        const state = {
            prepare: {
                imageManifest: vi.fn().mockResolvedValue(undefined),
                artefactMask: vi.fn().mockResolvedValue(undefined),
            },
            imagedObjects: { find: vi.fn() },
        };

        const w = mountComponent(ArtefactSvg, {
            props: { artefact },
            state,
        });

        await (w.vm as any).mountedDone;
        // Tear down before the loaded->true reactive render (bare <slot> crashes the
        // compat renderer in happy-dom).
        w.unmount();

        expect(state.prepare.imageManifest).toHaveBeenCalledTimes(1);
        expect(state.prepare.artefactMask).toHaveBeenCalledWith(artefact);
    });
});
