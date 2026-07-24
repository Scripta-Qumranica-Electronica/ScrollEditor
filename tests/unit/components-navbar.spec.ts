import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Component-mount unit test for Navbar. Mocks SessionService and the router module;
// stubs all child components. Exercises the @click handlers (login/logout/
// changePassword/updateUserDetails/goHome/goPrivate/goPublic/goAbout/showFAQModal/
// showEulaModal/showCitation/goGuide/reportProblemModal/contactUs) plus the
// computed getters driven by $state.

const { logout, routerPush } = vi.hoisted(() => ({
    logout: vi.fn(),
    routerPush: vi.fn(),
}));
vi.mock('@/services/session', () => ({
    default: vi.fn(function () { return { logout }; }),
}));
vi.mock('@/router', () => ({ default: { push: routerPush } }));

import Navbar from '@/components/navigation/Navbar.vue';
import { mountComponent } from './helpers/mount';

function makeState(over: any = {}) {
    return {
        editions: { current: null },
        artefacts: { current: null },
        imagedObjects: { current: null },
        operationsManager: null,
        session: { user: null, language: 'en' },
        ...over,
    };
}

function mountNav(state = makeState()) {
    return mountComponent(Navbar, {
        state,
        mocks: { $router: { push: routerPush } },
        stubs: {
            login: true, register: true, 'faq-modal': true, 'eula-modal': true,
            'citation-modal': true, 'edition-toolbox': true, 'report-problem-modal': true,
            'b-navbar': true, 'b-navbar-brand': true, 'b-navbar-nav': true,
            'b-nav-item': true, 'b-nav-item-dropdown': true, 'b-dropdown-item': true,
            'b-dropdown-divider': true, 'b-button': true, 'b-badge': true,
            'router-link': true,
        },
    });
}

describe('navbar', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    let reloadSpy: any;
    let hrefSpy: any;

    beforeEach(() => {
        vi.clearAllMocks();
        // location.reload / href are read-only in happy-dom; replace them.
        reloadSpy = vi.fn();
        hrefSpy = '';
        Object.defineProperty(window, 'location', {
            configurable: true,
            value: { reload: reloadSpy, set href(v: string) { hrefSpy = v; }, get href() { return hrefSpy; } },
        });
    });
    afterEach(() => openSpy.mockClear());

    it('modal show() handlers call show() on the referenced modal', () => {
        // $refs is a readonly proxy on the mounted vm, so exercise the one-line
        // handler bodies against a controlled `this` carrying stub modals.
        const refs: any = {
            loginModal: { show: vi.fn() },
            faqModal: { show: vi.fn() },
            eulaModal: { show: vi.fn() },
            citationModal: { show: vi.fn() },
            reportProblemModalRef: { show: vi.fn() },
        };
        const ctx = { $refs: refs };
        const m: any = (Navbar as any).methods;

        m.login.call(ctx);
        m.showFAQModal.call(ctx);
        m.showEulaModal.call(ctx);
        m.showCitation.call(ctx);
        m.reportProblemModal.call(ctx);

        expect(refs.loginModal.show).toHaveBeenCalledTimes(1);
        expect(refs.faqModal.show).toHaveBeenCalledTimes(1);
        expect(refs.eulaModal.show).toHaveBeenCalledTimes(1);
        expect(refs.citationModal.show).toHaveBeenCalledTimes(1);
        expect(refs.reportProblemModalRef.show).toHaveBeenCalledTimes(1);
    });

    it('router navigation handlers push the right paths', () => {
        const w = mountNav();
        w.vm.goHome();
        expect(routerPush).toHaveBeenCalledWith({ path: '/' });
        w.vm.goPrivate();
        expect(routerPush).toHaveBeenCalledWith({ path: '/home/private' });
        w.vm.goPublic();
        expect(routerPush).toHaveBeenCalledWith({ path: '/home/public' });

        w.vm.changePassword();
        expect(routerPush).toHaveBeenCalledWith('/changePassword');
        w.vm.updateUserDetails();
        expect(routerPush).toHaveBeenCalledWith('/updateUserDetails');
    });

    it('external-link handlers open new windows', () => {
        const w = mountNav();
        w.vm.goGuide();
        w.vm.goAbout();
        expect(openSpy).toHaveBeenCalledTimes(2);
        expect(openSpy.mock.calls[0][0]).toContain('sway.office.com');
        expect(openSpy.mock.calls[1][0]).toContain('qumranica.org');
    });

    it('contactUs sets a mailto href', () => {
        const w = mountNav();
        w.vm.contactUs();
        expect(window.location.href).toContain('mailto:');
    });

    it('logout logs out, routes home and reloads', () => {
        const w = mountNav();
        w.vm.logout();
        expect(logout).toHaveBeenCalledTimes(1);
        expect(routerPush).toHaveBeenCalledWith('/');
        expect(reloadSpy).toHaveBeenCalledTimes(1);
    });

    it('changeLanguage updates locale + state', () => {
        const state = makeState();
        const w = mountNav(state);
        w.vm.changeLanguage('he');
        expect(w.vm.currentLanguage).toBe('he');
        expect(state.session.language).toBe('he');
        expect(w.vm.$i18n.locale).toBe('he');
        w.vm.$i18n.locale = 'en';
    });

    it('user getters reflect $state.session.user', () => {
        const anon = mountNav(makeState());
        expect(anon.vm.userNameExists).toBe(false);
        expect(anon.vm.userName).toBeUndefined();
        expect(anon.vm.isActive).toBe(false);

        const loggedIn = mountNav(makeState({
            session: { user: { forename: 'Ada', surname: 'Lovelace', activated: true }, language: 'en' },
        }));
        expect(loggedIn.vm.userNameExists).toBe(true);
        expect(loggedIn.vm.userName).toBe('Ada Lovelace');
        expect(loggedIn.vm.isActive).toBe(true);
    });

    it('edition getters reflect $state.editions.current', () => {
        const noEd = mountNav(makeState());
        expect(noEd.vm.edition).toBeNull();
        expect(noEd.vm.editionBadge).toBe('');
        expect(noEd.vm.editionBadgeClass).toBe('');

        const pub = mountNav(makeState({ editions: { current: { id: 3, isPublic: true } } }));
        expect(pub.vm.editionBadge).toBe('Published');
        expect(pub.vm.editionBadgeClass).toBe('status-badge-published');

        const draft = mountNav(makeState({ editions: { current: { id: 4, isPublic: false } } }));
        expect(draft.vm.editionBadge).toBe('Draft');
        expect(draft.vm.editionBadgeClass).toBe('status-badge-draft');
    });

    it('artefact / imaged-object links & labels depend on the current selection', () => {
        const base = { editions: { current: { id: 7, isPublic: false } } };
        const none = mountNav(makeState(base));
        expect(none.vm.artefactLink).toBe('/editions/7/artefacts/');
        expect(none.vm.artefactLabel).toBe('Artefacts');
        expect(none.vm.imagedObjectLink).toBe('/editions/7/imaged-objects/');
        expect(none.vm.imagedObjectLabel).toBe('Imaged Objects');

        const selected = mountNav(makeState({
            ...base,
            artefacts: { current: { id: 55 } },
            imagedObjects: { current: { id: 'IO 1' } },
        }));
        expect(selected.vm.artefactLink).toBe('/editions/7/artefacts/55');
        expect(selected.vm.artefactLabel).toBe('Artefact');
        expect(selected.vm.imagedObjectLink).toBe('/editions/7/imaged-objects/IO%201');
        expect(selected.vm.imagedObjectLabel).toBe('Imaged Object');
    });

    it('showOperationsManager requires a writable edition + manager', () => {
        const off = mountNav(makeState());
        expect(off.vm.showOperationsManager).toBe(false);

        const mgr = { undo: vi.fn(), redo: vi.fn() };
        const on = mountNav(makeState({
            operationsManager: mgr,
            editions: { current: { id: 1, permission: { readOnly: false } } },
        }));
        expect(on.vm.showOperationsManager).toBe(true);
        on.vm.onUndo();
        on.vm.onRedo();
        expect(mgr.undo).toHaveBeenCalledTimes(1);
        expect(mgr.redo).toHaveBeenCalledTimes(1);
    });
});
