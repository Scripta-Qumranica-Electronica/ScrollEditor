import { describe, it, expect, vi, beforeEach } from 'vitest';

// Component-mount unit test for Activation. Mocks SessionService and router;
// exercises change() (activate success + service-reject branches).

const { activateUser, routerPush } = vi.hoisted(() => ({
    activateUser: vi.fn().mockResolvedValue({}),
    routerPush: vi.fn(),
}));
vi.mock('@/services/session', () => ({
    default: vi.fn(function () { return { activateUser }; }),
}));
vi.mock('@/router', () => ({ default: { push: routerPush } }));

import Activation from '@/views/user/Activation.vue';
import { mountComponent } from './helpers/mount';

function mountAct() {
    return mountComponent(Activation, {
        stubs: {
            'b-row': true, 'b-col': true,
            'b-button': true, 'font-awesome-icon': true,
        },
    });
}

describe('activation', () => {
    beforeEach(() => vi.clearAllMocks());

    it('change() activates with the token and routes home on success', async () => {
        const w = mountAct();
        w.vm.token = 'tokABC';
        await w.vm.change();

        expect(activateUser).toHaveBeenCalledTimes(1);
        expect(activateUser.mock.calls[0][0].token).toBe('tokABC');
        expect(routerPush).toHaveBeenCalledWith('/');
        expect(w.vm.waiting).toBe(false);
    });

    it('change() sets errorMessage on service rejection', async () => {
        activateUser.mockRejectedValueOnce({ response: { data: { msg: 'expired' } } });
        const w = mountAct();
        w.vm.token = 'tok';
        await w.vm.change();

        expect(w.vm.errorMessage).toContain('expired');
        expect(routerPush).not.toHaveBeenCalled();
        expect(w.vm.waiting).toBe(false);
    });
});
