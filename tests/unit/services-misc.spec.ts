import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the network layers before importing the services.
vi.mock('@/services/comm-helper', () => ({
    CommHelper: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));
vi.mock('axios', () => ({ default: { get: vi.fn(), post: vi.fn() } }));

import { CommHelper } from '@/services/comm-helper';
import axios from 'axios';
import ImageService from '@/services/image';
import ErrorService from '@/services/error';
import QwbProxyService from '@/services/qwb-proxy';
import SearchService from '@/services/search';
import UtilsService from '@/services/utils';
import { ApiRoutes } from '@/services/api-routes';
import { Polygon } from '@/utils/Polygons';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mocked = (fn: any) => fn as ReturnType<typeof vi.fn>;

beforeEach(() => {
    vi.clearAllMocks();
});

describe('ImageService', () => {
    it('fetches an image manifest from the image manifestUrl', async () => {
        mocked(axios.get).mockResolvedValue({ data: { '@id': 'manifest' } });
        const svc = new ImageService();
        const result = await svc.getImageManifest({ manifestUrl: 'http://iiif/manifest.json' } as never);
        expect(axios.get).toHaveBeenCalledWith('http://iiif/manifest.json');
        expect(result).toEqual({ '@id': 'manifest' });
    });
});

describe('ErrorService', () => {
    it('formats an error message', () => {
        const svc = new ErrorService({} as never);
        expect(svc.getErrorMessage({ msg: 'boom' })).toBe('Error: boom');
    });
});

describe('QwbProxyService', () => {
    it('gets word variants / parallel text / bibliography via the QWB routes', async () => {
        mocked(CommHelper.get).mockResolvedValue({ data: { ok: true } });
        const svc = new QwbProxyService();

        await svc.getQwbWordVariants(42);
        expect(CommHelper.get).toHaveBeenLastCalledWith(ApiRoutes.qwbWordVariantUrl(42));

        await svc.getQwbParallelText(1, 9);
        expect(CommHelper.get).toHaveBeenLastCalledWith(ApiRoutes.qwbParallelTextUrl(1, 9));

        const bib = await svc.getQwbBibliography(7);
        expect(CommHelper.get).toHaveBeenLastCalledWith(ApiRoutes.qwbBibliographyUrl(7));
        expect(bib).toEqual({ ok: true });
    });
});

describe('SearchService', () => {
    it('defaults empty designation/reference arrays and posts to the search url', async () => {
        mocked(CommHelper.post).mockResolvedValue({ data: { imagedObjects: [], textFragments: [] } });
        const svc = new SearchService();
        const req = { textDesignation: ['x'] } as never;
        const res = await svc.search(req);

        expect(CommHelper.post).toHaveBeenCalledWith(ApiRoutes.searchUrl(), req);
        // The service backfilled the missing arrays on the request object.
        expect((req as { artefactDesignation: unknown[] }).artefactDesignation).toEqual([]);
        expect((req as { textReference: unknown[] }).textReference).toEqual([]);
        expect(res).toEqual({ imagedObjects: [], textFragments: [] });
    });

    it('preserves already-present arrays', async () => {
        mocked(CommHelper.post).mockResolvedValue({ data: {} });
        const svc = new SearchService();
        const req = { artefactDesignation: ['a'], textReference: ['b'] } as never;
        await svc.search(req);
        expect((req as { artefactDesignation: unknown[] }).artefactDesignation).toEqual(['a']);
    });
});

describe('UtilsService', () => {
    it('repairs a polygon by round-tripping WKT through the API', async () => {
        const repaired = 'POLYGON((0 0,10 0,10 10,0 10,0 0))';
        mocked(CommHelper.post).mockResolvedValue({ data: { wktPolygon: repaired } });
        const svc = new UtilsService();
        const input = Polygon.fromWkt('POLYGON((0 0,5 0,5 5,0 5,0 0))');

        const result = await svc.repairPolygon(input);
        expect(CommHelper.post).toHaveBeenCalledWith(
            ApiRoutes.repairPolygonUrl(),
            { wktPolygon: input.wkt },
        );
        expect(result.wkt).toContain('10 10');
    });
});
