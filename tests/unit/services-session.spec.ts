import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StateManager } from '@/state';

vi.mock('@/services/comm-helper', () => ({
    CommHelper: {
        get: vi.fn(),
        put: vi.fn(),
        post: vi.fn(),
        delete: vi.fn(),
    },
}));

const { userChanged } = vi.hoisted(() => ({ userChanged: vi.fn() }));
vi.mock('@/state/signalr-connection', () => ({
    SignalRWrapper: {
        instance: {
            userChanged,
            registerNotificationHandler: vi.fn(),
            unregisterNotificationHandler: vi.fn(),
            subscribeEdition: vi.fn(),
            unsubscribeEdition: vi.fn(),
            connect: vi.fn(),
            disconnect: vi.fn(),
        },
    },
}));

import { CommHelper } from '@/services/comm-helper';
import SessionService from '@/services/session';

const comm = CommHelper as unknown as {
    get: ReturnType<typeof vi.fn>;
    put: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
};

const st = StateManager.instance;

describe('SessionService', () => {
    let svc: SessionService;
    beforeEach(() => {
        vi.clearAllMocks();
        st.session.user = null as any;
        st.session.token = undefined;
        svc = new SessionService();
    });

    describe('login', () => {
        it('stores user + token and notifies signalr', async () => {
            comm.post.mockResolvedValue({
                data: { userId: 1, email: 'a@b.com', token: 'tok', activated: true },
            });
            await svc.login('a@b.com', 'pw');
            expect(st.session.token).toBe('tok');
            expect(st.session.user!.email).toBe('a@b.com');
            expect(userChanged).toHaveBeenCalled();
            expect(comm.post).toHaveBeenCalledWith(
                '/v1/users/login',
                { email: 'a@b.com', password: 'pw' },
                false
            );
        });
    });

    it('logout clears the session and notifies signalr', () => {
        st.session.user = { userId: 1, email: 'a@b.com' } as any;
        st.session.token = 'tok';
        svc.logout();
        expect(st.session.user).toBeNull();
        expect(st.session.token).toBeUndefined();
        expect(userChanged).toHaveBeenCalled();
    });

    describe('isTokenValid', () => {
        it('returns false with no token', async () => {
            expect(await svc.isTokenValid()).toBe(false);
        });

        it('returns true and sets user on success', async () => {
            st.session.token = 'tok';
            comm.get.mockResolvedValue({ data: { userId: 1, email: 'a@b.com' } });
            expect(await svc.isTokenValid()).toBe(true);
            expect(st.session.user!.userId).toBe(1);
        });

        it('clears the session and returns false on error', async () => {
            st.session.token = 'tok';
            st.session.user = { userId: 1, email: 'a@b.com' } as any;
            comm.get.mockRejectedValue(new Error('401'));
            expect(await svc.isTokenValid()).toBe(false);
            expect(st.session.user).toBeNull();
            expect(st.session.token).toBeUndefined();
        });
    });

    it('forgotPassword swallows errors', async () => {
        comm.post.mockRejectedValue(new Error('boom'));
        await expect(svc.forgotPassword('a@b.com')).resolves.toBeUndefined();
        expect(comm.post).toHaveBeenCalledWith(
            '/v1/users/forgot-password',
            { email: 'a@b.com' }
        );
    });

    it('register returns a UserInfo', async () => {
        comm.post.mockResolvedValue({ data: { userId: 3, email: 'n@n.com' } });
        const info = await svc.register({ email: 'n@n.com' } as any);
        expect(info.email).toBe('n@n.com');
        expect(comm.post).toHaveBeenCalledWith('/v1/users', { email: 'n@n.com' }, false);
    });

    it('changePassword posts to the change-password url', async () => {
        comm.post.mockResolvedValue({ data: {} });
        await svc.changePassword({ oldPassword: 'a', newPassword: 'b' } as any);
        expect(comm.post).toHaveBeenCalledWith('/v1/users/change-password', {
            oldPassword: 'a',
            newPassword: 'b',
        });
    });

    it('changeForgottenPassword posts without credentials', async () => {
        comm.post.mockResolvedValue({ data: {} });
        await svc.changeForgottenPassword({ token: 't', password: 'p' } as any);
        expect(comm.post).toHaveBeenCalledWith(
            '/v1/users/change-forgotten-password',
            { token: 't', password: 'p' },
            false
        );
    });

    it('activateUser posts without credentials', async () => {
        comm.post.mockResolvedValue({ data: {} });
        await svc.activateUser({ token: 't' } as any);
        expect(comm.post).toHaveBeenCalledWith(
            '/v1/users/confirm-registration',
            { token: 't' },
            false
        );
    });

    it('updateUser returns the response data', async () => {
        comm.put.mockResolvedValue({ data: { userId: 1, email: 'x@x.com' } });
        const res = await svc.updateUser({ email: 'x@x.com' } as any);
        expect(res.email).toBe('x@x.com');
        expect(comm.put).toHaveBeenCalledWith('/v1/users', { email: 'x@x.com' });
    });

    it('reportProblem returns the response data', async () => {
        comm.post.mockResolvedValue({ data: true });
        const res = await svc.reportProblem({ body: 'bug' } as any);
        expect(res).toBe(true);
        expect(comm.post).toHaveBeenCalledWith('/v1/utils/report-github-issue', {
            body: 'bug',
        });
    });
});
