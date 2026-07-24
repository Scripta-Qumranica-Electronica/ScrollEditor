import { describe, it, expect, vi } from 'vitest';

vi.mock('@/views/home/components/personal-editions.vue', () => ({ default: { name: 'personal-editions', render: () => null } }));
vi.mock('@/views/home/components/public-editions.vue', () => ({ default: { name: 'public-editions', render: () => null } }));

import Home from '@/views/home/Home.vue';
import { mountComponent } from './helpers/mount';

function makeState(over: any = {}) {
    return {
        prepare: { allEditions: vi.fn().mockResolvedValue(undefined) },
        editions: { current: null, items: over.items ?? [] },
        session: { user: over.user ?? null },
    };
}

function mountHome(opts: { editionType?: string; user?: any; items?: any[] } = {}) {
    const state = makeState({ user: opts.user, items: opts.items });
    const push = vi.fn();
    const replace = vi.fn();
    const route = { name: 'home', params: { editionType: opts.editionType } };
    const w = mountComponent(Home, {
        state,
        mocks: { $route: route, $router: { push, replace }, $tc: (s: string) => s },
        stubs: { 'b-tabs': true, 'b-tab': true, 'b-spinner': true, 'personal-editions': true, 'public-editions': true },
    });
    return { w, state, push, replace, route };
}

describe('Home', () => {
    it('created prepares editions and clears the current edition', () => {
        const { w, state } = mountHome();
        expect(state.prepare.allEditions).toHaveBeenCalled();
        expect(state.editions.current).toBeNull();
    });

    it('mounted marks editions loaded', async () => {
        const { w } = mountHome();
        await w.vm.$nextTick();
        await Promise.resolve();
        expect(w.vm.editionsLoaded).toBe(true);
    });

    it('mounted switches to the public tab when the route asks for it', async () => {
        const { w } = mountHome({ editionType: 'public' });
        await w.vm.$nextTick();
        await w.vm.$nextTick();
        expect(w.vm.activeTab).toBe(1);
    });

    it('mounted redirects to public when a private route is requested without a user', async () => {
        const { w, replace } = mountHome({ editionType: 'private', user: null });
        await w.vm.$nextTick();
        expect(replace).toHaveBeenCalledWith('/home/public');
    });

    it('user getter reflects the session', () => {
        expect(mountHome({ user: { id: 1 } }).w.vm.user).toBe(true);
        expect(mountHome({ user: null }).w.vm.user).toBe(false);
    });

    it('edition counts split by isPublic', () => {
        const items = [{ isPublic: true }, { isPublic: false }, { isPublic: false }];
        const { w } = mountHome({ items });
        expect(w.vm.personalEditionsCount).toBe(2);
        expect(w.vm.publicEditionsCount).toBe(1);
    });

    it('nameMatch is case-insensitive against the filter', () => {
        const { w } = mountHome();
        w.vm.filter = 'gen';
        expect(w.vm.nameMatch('Genesis')).toBe(true);
        expect(w.vm.nameMatch('Exodus')).toBe(false);
    });

    describe('onActivateTab', () => {
        it('ignores the initial activation (prevTabIndex -1)', () => {
            const { w, push } = mountHome();
            w.vm.onActivateTab({ newTabIndex: 1, prevTabIndex: -1 } as any);
            expect(push).not.toHaveBeenCalled();
        });

        it('navigates to private when moving to tab 0 from a public route', () => {
            const { w, push } = mountHome({ editionType: 'public' });
            w.vm.onActivateTab({ newTabIndex: 0, prevTabIndex: 1 } as any);
            expect(push).toHaveBeenCalledWith('/home/private');
        });

        it('navigates to public when moving to tab 1 from a private route', () => {
            const { w, push } = mountHome({ editionType: 'private' });
            w.vm.onActivateTab({ newTabIndex: 1, prevTabIndex: 0 } as any);
            expect(push).toHaveBeenCalledWith('/home/public');
        });

        it('does not navigate when already on the matching route', () => {
            const { w, push } = mountHome({ editionType: 'private' });
            w.vm.onActivateTab({ newTabIndex: 0, prevTabIndex: 1 } as any);
            expect(push).not.toHaveBeenCalled();
        });
    });

    describe('onRouteChanged', () => {
        it('ignores navigations away from home', () => {
            const { w } = mountHome();
            w.vm.activeTab = 5;
            w.vm.onRouteChanged({ name: 'editions', params: {} }, {});
            expect(w.vm.activeTab).toBe(5); // untouched
        });

        it('activates the public tab for a public route', () => {
            const { w } = mountHome();
            w.vm.onRouteChanged({ name: 'home', params: { editionType: 'public' } }, {});
            expect(w.vm.activeTab).toBe(1);
        });

        it('activates the personal tab otherwise', () => {
            const { w } = mountHome();
            w.vm.activeTab = 1;
            w.vm.onRouteChanged({ name: 'home', params: { editionType: 'private' } }, {});
            expect(w.vm.activeTab).toBe(0);
        });
    });
});
