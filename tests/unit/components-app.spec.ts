import { describe, it, expect, vi, beforeEach } from 'vitest';

// Component-mount unit test for App.vue. Mocks SessionService; stubs the child
// components. Exercises created() wiring (eventBus 'corrupted-state' listener,
// initializeApp -> waiting flip), showScreenSizeAlert resize handling and
// openCorruptedStateDialog.

const { isTokenValid } = vi.hoisted(() => ({
    isTokenValid: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/services/session', () => ({
    default: vi.fn(function () { return { isTokenValid }; }),
}));

import App from '@/App.vue';
import { mountComponent } from './helpers/mount';

function makeEventBus() {
    const handlers: Record<string, Function[]> = {};
    return {
        handlers,
        on: vi.fn((e: string, h: Function) => { (handlers[e] ||= []).push(h); }),
        off: vi.fn((e: string, h: Function) => {
            handlers[e] = (handlers[e] || []).filter((x) => x !== h);
        }),
        emit: (e: string, ...args: any[]) => (handlers[e] || []).forEach((h) => h(...args)),
    };
}

function mountApp() {
    const eventBus = makeEventBus();
    const state = {
        session: { language: 'en' },
        eventBus,
    };
    const w = mountComponent(App, {
        state,
        stubs: {
            navbar: true, Waiting: true, 'router-view': true,
            'corrupted-state-dialog': true, 'screen-size-alert': true,
        },
    });
    return { w, eventBus };
}

describe('app', () => {
    beforeEach(() => vi.clearAllMocks());

    it('created() registers a corrupted-state listener and initializes the app', async () => {
        const { w, eventBus } = mountApp();
        expect(eventBus.on).toHaveBeenCalledWith('corrupted-state', expect.any(Function));
        expect(isTokenValid).toHaveBeenCalledTimes(1);
        await Promise.resolve();
        await w.vm.$nextTick();
        expect(w.vm.waiting).toBe(false);
    });

    it('the corrupted-state event opens the dialog', async () => {
        const { w, eventBus } = mountApp();
        expect(w.vm.corruptedStateVisible).toBe(false);
        eventBus.emit('corrupted-state');
        expect(w.vm.corruptedStateVisible).toBe(true);
    });

    it('openCorruptedStateDialog toggles corruptedStateVisible', () => {
        const { w } = mountApp();
        w.vm.openCorruptedStateDialog();
        expect(w.vm.corruptedStateVisible).toBe(true);
    });

    it('showScreenSizeAlert shows the alert below 1000px and hides it above', () => {
        const { w } = mountApp();
        const evt = { preventDefault: vi.fn() } as any;

        (window as any).outerWidth = 800;
        w.vm.showScreenSizeAlert(evt);
        expect(evt.preventDefault).toHaveBeenCalled();
        expect(w.vm.alertVisible).toBe(true);

        (window as any).outerWidth = 1400;
        w.vm.showScreenSizeAlert(evt);
        expect(w.vm.alertVisible).toBe(false);
    });
});
