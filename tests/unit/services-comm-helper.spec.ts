import { describe, it, expect, beforeEach, vi } from 'vitest';
import axios from 'axios';
import { CommHelper } from '@/services/comm-helper';
import { StateManager } from '@/state';

vi.mock('axios', () => ({
    default: {
        get: vi.fn(() => Promise.resolve({ data: {} })),
        put: vi.fn(() => Promise.resolve({ data: {} })),
        post: vi.fn(() => Promise.resolve({ data: {} })),
        delete: vi.fn(() => Promise.resolve({ data: {} })),
    },
}));

const mockedAxios = axios as unknown as {
    get: ReturnType<typeof vi.fn>;
    put: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
};

// The backend prefix injected by vitest.config.mts.
const PREFIX = 'http://localhost:5000';

describe('CommHelper', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        StateManager.instance.session.token = undefined;
    });

    describe('getFullUrl', () => {
        it('prepends a leading slash when the url has none', async () => {
            await CommHelper.get('v1/foo');
            expect(mockedAxios.get).toHaveBeenCalledWith(
                `${PREFIX}/v1/foo`,
                undefined
            );
        });

        it('keeps an existing leading slash', async () => {
            await CommHelper.get('/v1/bar');
            expect(mockedAxios.get.mock.calls[0][0]).toBe(`${PREFIX}/v1/bar`);
        });
    });

    describe('auth header', () => {
        it('adds Authorization when a token is present and credentials are used', async () => {
            StateManager.instance.session.token = 'tok';
            await CommHelper.get('/v1/secure');
            expect(mockedAxios.get).toHaveBeenCalledWith(`${PREFIX}/v1/secure`, {
                headers: { Authorization: 'Bearer tok' },
            });
        });

        it('omits options entirely when there is no token', async () => {
            await CommHelper.get('/v1/open');
            expect(mockedAxios.get).toHaveBeenCalledWith(
                `${PREFIX}/v1/open`,
                undefined
            );
        });

        it('omits Authorization when useCredentials is false even with a token', async () => {
            StateManager.instance.session.token = 'tok';
            await CommHelper.get('/v1/open', false);
            expect(mockedAxios.get).toHaveBeenCalledWith(
                `${PREFIX}/v1/open`,
                undefined
            );
        });
    });

    describe('get', () => {
        it('returns the axios response', async () => {
            mockedAxios.get.mockResolvedValueOnce({ data: { hello: 'world' } });
            const res = await CommHelper.get<{ hello: string }>('/v1/x');
            expect(res.data.hello).toBe('world');
        });
    });

    describe('put', () => {
        it('passes body and no options with no token', async () => {
            const body = { a: 1 };
            await CommHelper.put('/v1/put', body);
            expect(mockedAxios.put).toHaveBeenCalledWith(
                `${PREFIX}/v1/put`,
                body,
                undefined
            );
        });

        it('adds X-Operation-Id header when opId is supplied (with token)', async () => {
            StateManager.instance.session.token = 'tok';
            await CommHelper.put('/v1/put', { a: 1 }, true, 'op-123');
            expect(mockedAxios.put).toHaveBeenCalledWith(
                `${PREFIX}/v1/put`,
                { a: 1 },
                { headers: { Authorization: 'Bearer tok', 'X-Operation-Id': 'op-123' } }
            );
        });

        it('adds X-Operation-Id header even without a token', async () => {
            await CommHelper.put('/v1/put', { a: 1 }, false, 'op-xyz');
            expect(mockedAxios.put).toHaveBeenCalledWith(
                `${PREFIX}/v1/put`,
                { a: 1 },
                { headers: { 'X-Operation-Id': 'op-xyz' } }
            );
        });
    });

    describe('post', () => {
        it('passes body and auth header', async () => {
            StateManager.instance.session.token = 'tok';
            const body = { name: 'x' };
            await CommHelper.post('/v1/post', body);
            expect(mockedAxios.post).toHaveBeenCalledWith(
                `${PREFIX}/v1/post`,
                body,
                { headers: { Authorization: 'Bearer tok' } }
            );
        });

        it('sends no options when credentials disabled and no opId', async () => {
            await CommHelper.post('/v1/post', { a: 1 }, false);
            expect(mockedAxios.post).toHaveBeenCalledWith(
                `${PREFIX}/v1/post`,
                { a: 1 },
                undefined
            );
        });
    });

    describe('delete', () => {
        it('calls axios.delete with options', async () => {
            StateManager.instance.session.token = 'tok';
            await CommHelper.delete('/v1/del');
            expect(mockedAxios.delete).toHaveBeenCalledWith(`${PREFIX}/v1/del`, {
                headers: { Authorization: 'Bearer tok' },
            });
        });
    });
});
