import { describe, it, expect, vi } from 'vitest';
import { IIIFImage, Image, ImageStack } from '@/models/image';
import type { EditionInfo } from '@/models/edition';
import type { ImageDTO, ImageStackDTO } from '@/dtos/sqe-dtos';
import { BoundingBox } from '@/utils/helpers';

const MANIFEST = JSON.stringify({
    width: 1000,
    height: 2000,
    sizes: [
        { width: 250, height: 500 },
        { width: 500, height: 1000 },
        { width: 1000, height: 2000 },
    ],
});

// Minimal edition stub — Image/ImageStack only read edition.metrics.ppi.
function fakeEdition(ppi = 300): EditionInfo {
    return { metrics: { ppi } } as unknown as EditionInfo;
}

function makeImageDto(over: Partial<ImageDTO> = {}): ImageDTO {
    return {
        id: 1,
        url: 'http://iiif/img1',
        lightingType: 'direct' as any,
        lightingDirection: 'top' as any,
        waveLength: ['550'],
        type: 'color',
        side: 'recto',
        ppi: 300,
        imageManifest: MANIFEST,
        master: true,
        catalogNumber: 42,
        ...over,
    };
}

describe('image — IIIFImage', () => {
    it('constructs with url only (no manifest)', () => {
        const img = new IIIFImage('http://iiif/x');
        expect(img.url).toBe('http://iiif/x');
        expect(img.manifest).toBeUndefined();
        expect(img.ppiAdjustmentFactor).toBe(1);
    });

    it('parses a valid manifest string', () => {
        const img = new IIIFImage('http://iiif/x', MANIFEST);
        expect(img.manifest).toBeDefined();
        expect(img.manifest!.width).toBe(1000);
    });

    it('warns and leaves manifest undefined on invalid manifest', () => {
        const spy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        const img = new IIIFImage('http://iiif/x', '{not json');
        expect(img.manifest).toBeUndefined();
        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
    });

    it('builds manifestUrl / thumbnailUrl / fullUrl', () => {
        const img = new IIIFImage('http://iiif/x');
        expect(img.manifestUrl).toBe('http://iiif/x/info.json');
        expect(img.thumbnailUrl).toBe('http://iiif/x/full/150,/0/default.jpg');
        expect(img.getThumbnailUrl(300)).toBe('http://iiif/x/full/300,/0/default.jpg');
        expect(img.fullUrl()).toBe('http://iiif/x/full/pct:100/0/default.jpg');
        expect(img.getFullUrl(50, 'png')).toBe('http://iiif/x/full/pct:50/0/default.png');
    });

    it('getScaledAndCroppedUrl uses "full" at 100% and pct otherwise', () => {
        const img = new IIIFImage('http://iiif/x');
        expect(img.getScaledAndCroppedUrl(100, 1, 2, 3, 4)).toBe(
            'http://iiif/x/1,2,3,4/full/0/default.jpg'
        );
        expect(img.getScaledAndCroppedUrl(50, 1, 2, 3, 4, 'png')).toBe(
            'http://iiif/x/1,2,3,4/pct:50/0/default.png'
        );
    });

    it('width / height apply the ppiAdjustmentFactor', () => {
        const img = new IIIFImage('http://iiif/x', MANIFEST);
        img.ppiAdjustmentFactor = 2;
        expect(img.width).toBe(2000);
        expect(img.height).toBe(4000);
    });

    it('width / height throw with no manifest', () => {
        const img = new IIIFImage('http://iiif/x');
        expect(() => img.width).toThrow(/no manifest/);
        expect(() => img.height).toThrow(/no manifest/);
    });

    it('getOptimizedScaleFactor warns and returns 100 with no manifest', () => {
        const spy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        const img = new IIIFImage('http://iiif/x');
        expect(img.getOptimizedScaleFactor(100, 100)).toBe(100);
        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
    });

    it('getOptimizedScaleFactor picks a size matching the expected width', () => {
        const img = new IIIFImage('http://iiif/x', MANIFEST);
        // expectedWidth 250 -> first size (250) satisfies -> ceil(100*250/1000)=25
        expect(img.getOptimizedScaleFactor(250, 1)).toBe(25);
    });

    it('getOptimizedScaleFactor picks a size matching the expected height', () => {
        const img = new IIIFImage('http://iiif/x', MANIFEST);
        // expectedWidth 1e9 forces width checks to fail, height 500 satisfied by first size
        expect(img.getOptimizedScaleFactor(1e9, 500)).toBe(25);
    });

    it('getOptimizedScaleFactor falls back rounding up to nearest 5% when no size fits', () => {
        const noSizesManifest = JSON.stringify({ width: 1000, height: 2000 });
        const img = new IIIFImage('http://iiif/x', noSizesManifest);
        // realScale = 100 * min(100/1000, 200/2000) = 10 -> ceil(10/5)*5 = 10
        expect(img.getOptimizedScaleFactor(100, 200)).toBe(10);
    });

    it('getOptimizedScaleFactor honours a supplied bounding box', () => {
        const img = new IIIFImage('http://iiif/x', MANIFEST);
        const bb = new BoundingBox(0, 0, 500, 1000);
        const result = img.getOptimizedScaleFactor(250, 1, bb);
        expect(typeof result).toBe('number');
        expect(result).toBeGreaterThan(0);
    });
});

describe('image — Image', () => {
    it('constructs from a DTO and computes ppiAdjustmentFactor', () => {
        const img = new Image(makeImageDto({ ppi: 150 }), fakeEdition(300));
        expect(img.type).toBe('color');
        expect(img.side).toBe('recto');
        expect(img.waveLength).toEqual(['550']);
        expect(img.master).toBe(true);
        expect(img.catalogNumber).toBe(42);
        expect(img.id).toBe(1);
        expect(img.ppi).toBe(150);
        // 300 / 150 = 2
        expect(img.ppiAdjustmentFactor).toBe(2);
    });

    it('has no region polygons when the DTO omits them', () => {
        const img = new Image(makeImageDto(), fakeEdition());
        expect(img.regionInMaster).toBeUndefined();
        expect(img.regionOfMaster).toBeUndefined();
    });

    it('builds region polygons from regionInMasterImage', () => {
        const img = new Image(
            makeImageDto({ regionInMasterImage: 'M0 0L10 0 L10 10 L0 10 L0 0' }),
            fakeEdition()
        );
        expect(img.regionInMaster).toBeDefined();
        expect(img.regionOfMaster).toBeDefined();
    });
});

describe('image — ImageStack', () => {
    function makeStackDto(over: Partial<ImageStackDTO> = {}): ImageStackDTO {
        return {
            id: 7,
            masterIndex: 0,
            images: [
                makeImageDto({ id: 1, type: 'color', master: true }),
                makeImageDto({ id: 2, type: 'infrared', master: false }),
            ],
            ...over,
        };
    }

    it('constructs and exposes id, masterIndex, images, availableImageTypes', () => {
        const stack = new ImageStack(makeStackDto(), fakeEdition());
        expect(stack.id).toBe(7);
        expect(stack.masterIndex).toBe(0);
        expect(stack.images).toHaveLength(2);
        expect(stack.availableImageTypes).toEqual(['color', 'infrared']);
    });

    it('throws if id is undefined', () => {
        expect(() => new ImageStack(makeStackDto({ id: undefined }), fakeEdition())).toThrow(
            /id and masterIndex/
        );
    });

    it('throws if masterIndex is undefined', () => {
        expect(() =>
            new ImageStack(makeStackDto({ masterIndex: undefined }), fakeEdition())
        ).toThrow(/id and masterIndex/);
    });

    it('getImage returns the image of a type, or undefined', () => {
        const stack = new ImageStack(makeStackDto(), fakeEdition());
        expect(stack.getImage('infrared')!.id).toBe(2);
        expect(stack.getImage('nope')).toBeUndefined();
    });

    it('master returns the image at masterIndex', () => {
        const stack = new ImageStack(makeStackDto(), fakeEdition());
        expect(stack.master.id).toBe(1);
    });

    it('warns when the masterIndex image is not flagged master', () => {
        const spy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        new ImageStack(
            makeStackDto({
                images: [
                    makeImageDto({ id: 1, type: 'color', master: false }),
                    makeImageDto({ id: 2, type: 'infrared', master: true }),
                ],
            }),
            fakeEdition()
        );
        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
    });

    it('warns on duplicate image types', () => {
        const spy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        new ImageStack(
            makeStackDto({
                images: [
                    makeImageDto({ id: 1, type: 'color', master: true }),
                    makeImageDto({ id: 2, type: 'color', master: false }),
                ],
            }),
            fakeEdition()
        );
        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
    });

    it('fromMasterImage builds a single-image master stack', () => {
        const stack = ImageStack.fromMasterImage(
            99,
            'http://iiif/master',
            MANIFEST,
            300,
            'recto',
            fakeEdition(300)
        );
        expect(stack.id).toBe(99);
        expect(stack.masterIndex).toBe(0);
        expect(stack.images).toHaveLength(1);
        expect(stack.master.id).toBe(99);
        expect(stack.master.type).toBe('master');
        expect(stack.master.side).toBe('recto');
    });
});
