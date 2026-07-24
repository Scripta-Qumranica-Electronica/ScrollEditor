import { describe, it, expect, vi, beforeEach } from 'vitest';

// Component-mount unit test for UpdateUser. Mocks SessionService, the directly
// imported router, and $toasted; seeds $state.session.user. Exercises the
// disableChange getter and change() (success incl. email-change toast + error).

const { updateUser, routerPush } = vi.hoisted(() => ({
    updateUser: vi.fn().mockResolvedValue({ email: 'new@b.c', surname: 'B', forename: 'A', organization: 'Org' }),
    routerPush: vi.fn(),
}));
vi.mock('@/services/session', () => ({
    default: vi.fn(function () { return { updateUser }; }),
}));
vi.mock('@/router', () => ({ default: { push: routerPush } }));

import UpdateUser from '@/views/user/UpdateUser.vue';
import { mountComponent } from './helpers/mount';

function makeState() {
    return {
        session: {
            user: { surname: 'B', forename: 'A', email: 'a@b.c', organization: 'Org' },
        },
    };
}

function mountUU(state = makeState()) {
    return mountComponent(UpdateUser, {
        state,
        mocks: { $toasted: { show: vi.fn() } },
        stubs: {
            'b-row': true, 'b-col': true, 'b-form-input': true,
            'b-button': true, 'font-awesome-icon': true,
        },
    });
}

describe('update-user', () => {
    beforeEach(() => vi.clearAllMocks());

    it('created() seeds form fields from $state.session.user', () => {
        const w = mountUU();
        expect(w.vm.surname).toBe('B');
        expect(w.vm.forename).toBe('A');
        expect(w.vm.email).toBe('a@b.c');
        expect(w.vm.organization).toBe('Org');
    });

    it('disableChange: true with empty password or unchanged fields; false when changed + password', () => {
        const w = mountUU();
        expect(w.vm.disableChange).toBe(true); // no password

        w.vm.password = 'pw';
        expect(w.vm.disableChange).toBe(true); // nothing changed

        w.vm.forename = 'Changed';
        expect(w.vm.disableChange).toBe(false);
    });

    it('change() calls updateUser, routes home, toasts once (no email change)', async () => {
        const w = mountUU();
        w.vm.password = 'pw';
        w.vm.forename = 'Changed';
        await w.vm.change();

        expect(updateUser).toHaveBeenCalledTimes(1);
        expect(routerPush).toHaveBeenCalledWith('/');
        expect((w.vm as any).$toasted.show).toHaveBeenCalledTimes(1);
        expect(w.vm.waiting).toBe(false);
    });

    it('change() toasts twice when email changed', async () => {
        const w = mountUU();
        w.vm.password = 'pw';
        w.vm.email = 'new@b.c';
        await w.vm.change();

        expect((w.vm as any).$toasted.show).toHaveBeenCalledTimes(2);
    });

    it('change() sets errorMessage on failure', async () => {
        updateUser.mockRejectedValueOnce({ response: { data: { msg: 'nope' } } });
        const w = mountUU();
        w.vm.password = 'pw';
        w.vm.forename = 'Changed';
        await w.vm.change();

        expect(w.vm.errorMessage).toContain('nope');
        expect(w.vm.waiting).toBe(false);
    });
});
