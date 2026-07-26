import { describe, it, expect, vi, beforeEach } from 'vitest';

const { changeArtefact } = vi.hoisted(() => ({ changeArtefact: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/services/artefact', () => ({ default: class { public changeArtefact = changeArtefact; } }));
vi.mock('@/components/artefact/artefact-image.vue', () => ({ default: { name: 'artefact-image', render: () => null } }));

import ArtefactCard from '@/views/edition/components/artefact-card.vue';
import { mountComponent } from './helpers/mount';

// artefact-card uses $root.$emit (not settable on a compat mount proxy) and $refs;
// exercise the compiled options' methods/computed against a hand-built `this`.
const methods = (ArtefactCard as any).methods as Record<string, (...a: any[]) => any>;
const computed = (ArtefactCard as any).computed as Record<string, any>;
const mountedHook = (ArtefactCard as any).mounted as (...a: any[]) => any;
const unmountedHook = (ArtefactCard as any).unmounted as (...a: any[]) => any;

let lastObserver: any;
class MockIO {
    public cb: any;
    public observe = vi.fn();
    public disconnect = vi.fn();
    constructor(cb: any) { this.cb = cb; lastObserver = this; }
}

function makeCtx(opts: any = {}) {
    const ctx: any = {
        artefact: opts.artefact ?? { id: 42, name: 'Frag 1', side: 'recto' },
        newArtefactName: '',
        observed: false,
        prevLineMenuId: '',
        intersectionObserver: undefined,
        artefactService: { changeArtefact },
        $route: { params: { editionId: opts.editionId ?? '9' } },
        $root: { $emit: vi.fn() },
        $refs: { card: document.createElement('div') },
    };
    for (const [name, fn] of Object.entries(methods)) {
        ctx[name] = fn.bind(ctx);
    }
    for (const [name, def] of Object.entries(computed)) {
        Object.defineProperty(ctx, name, { get: (def.get ?? def).bind(ctx), configurable: true });
    }
    return ctx;
}

describe('artefact-card', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (globalThis as any).IntersectionObserver = MockIO as any;
    });

    it('editionId parses the route param', () => {
        expect(makeCtx({ editionId: '13' }).editionId).toBe(13);
    });

    it('renders the template with the artefact name/side and observed placeholder', () => {
        const w = mountComponent(ArtefactCard, {
            props: { artefact: { id: 42, name: 'Frag X', side: 'verso' } },
            mocks: { $route: { params: { editionId: '9' } } },
            stubs: { 'router-link': true, 'b-popover': true, 'b-button': true, 'artefact-image': true },
        });
        expect(w.text()).toContain('Frag X');
        expect(w.text()).toContain('verso');
        // Not yet observed -> the rings placeholder image is shown.
        expect(w.find('img.place-holder').exists()).toBe(true);
        // Field initializers run: the service instance and rename field exist.
        expect(w.vm.artefactService).toBeTruthy();
        expect(w.vm.newArtefactName).toBe('Frag X');
        w.unmount();
    });

    it('mounted starts observing and seeds the rename field', () => {
        const ctx = makeCtx({ artefact: { id: 1, name: 'Seed', side: 'recto' } });
        mountedHook.call(ctx);
        expect(lastObserver.observe).toHaveBeenCalledWith(ctx.$refs.card);
        expect(ctx.newArtefactName).toBe('Seed');
    });

    it('onObserved sets observed and disconnects when intersecting', () => {
        const ctx = makeCtx();
        mountedHook.call(ctx);
        const observer = ctx.intersectionObserver;
        ctx.onObserved([{ isIntersecting: true } as any]);
        expect(ctx.observed).toBe(true);
        expect(observer.disconnect).toHaveBeenCalled();
        expect(ctx.intersectionObserver).toBeUndefined();
    });

    it('onObserved ignores non-intersecting entries', () => {
        const ctx = makeCtx();
        mountedHook.call(ctx);
        ctx.onObserved([{ isIntersecting: false } as any]);
        expect(ctx.observed).toBe(false);
        expect(ctx.intersectionObserver).toBeDefined();
    });

    it('onObserved warns when it receives an unexpected number of entries', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        const ctx = makeCtx();
        mountedHook.call(ctx);
        ctx.onObserved([{ isIntersecting: true }, { isIntersecting: true }] as any);
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
    });

    it('openLineMenu prevents default, opens the popover (v-model) and records the id', () => {
        const ctx = makeCtx();
        const event = { preventDefault: vi.fn() } as any;
        ctx.openLineMenu(event, 'popover-line-42');
        expect(event.preventDefault).toHaveBeenCalled();
        // Vue-3: drives the <b-popover> via a boolean, not the removed bv:: bus.
        expect(ctx.lineMenuVisible).toBe(true);
        expect(ctx.prevLineMenuId).toBe('popover-line-42');
    });

    it('closeLineMenu hides the popover', () => {
        const ctx = makeCtx();
        ctx.lineMenuVisible = true;
        ctx.closeLineMenu();
        expect(ctx.lineMenuVisible).toBe(false);
    });

    it('renameArtefact saves the new name and hides the popover', async () => {
        const artefact = { id: 42, name: 'old', side: 'recto' };
        const ctx = makeCtx({ artefact, editionId: '9' });
        ctx.newArtefactName = 'Renamed';
        ctx.lineMenuVisible = true;
        await ctx.renameArtefact();
        expect(artefact.name).toBe('Renamed');
        expect(changeArtefact).toHaveBeenCalledWith(9, artefact);
        expect(ctx.lineMenuVisible).toBe(false);
    });

    it('unmounted disconnects a live observer', () => {
        const ctx = makeCtx();
        mountedHook.call(ctx);
        const observer = ctx.intersectionObserver;
        unmountedHook.call(ctx);
        expect(observer.disconnect).toHaveBeenCalled();
        expect(ctx.intersectionObserver).toBeUndefined();
    });

    it('unmounted is a no-op when there is no observer', () => {
        const ctx = makeCtx();
        ctx.intersectionObserver = undefined;
        expect(() => unmountedHook.call(ctx)).not.toThrow();
    });
});
