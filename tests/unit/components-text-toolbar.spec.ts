import { describe, it, expect, vi } from 'vitest';
import TextToolbar from '@/views/scroll-editor/text-toolbar.vue';
import { mountComponent } from './helpers/mount';

function makeState(opts: any = {}) {
    return {
        textFragmentEditor: { selectedTextFragment: opts.textFragment ?? null },
        showEditReconTextBar: opts.showEditReconTextBar ?? false,
    };
}

function mountToolbar(state: any) {
    return mountComponent(TextToolbar, {
        state,
        stubs: {
            'b-container': { template: '<div><slot /></div>' },
            'text-fragment': true,
            'sign-attribute-pane': true,
            'edit-sign-modal': true,
            'edit-virtual-artefact-text-pane': true,
        },
    });
}

describe('text-toolbar', () => {
    it('textFragment + showEditReconTextBar getters read state', () => {
        const tf = { id: 1 };
        const w = mountToolbar(makeState({ textFragment: tf, showEditReconTextBar: true }));
        expect(w.vm.textFragment).toBe(tf);
        expect(w.vm.showEditReconTextBar).toBe(true);
    });

    it('renders the sign-attribute pane when NOT editing recon text', () => {
        const w = mountToolbar(makeState({ showEditReconTextBar: false }));
        expect(w.find('sign-attribute-pane').exists()).toBe(true);
        expect(w.find('edit-virtual-artefact-text-pane').exists()).toBe(false);
    });

    it('renders the virtual-artefact text pane while editing recon text', () => {
        const w = mountToolbar(makeState({ showEditReconTextBar: true }));
        expect(w.find('edit-virtual-artefact-text-pane').exists()).toBe(true);
        expect(w.find('sign-attribute-pane').exists()).toBe(false);
    });

    it('renders the text-fragment when one is selected', () => {
        const w = mountToolbar(makeState({ textFragment: { id: 1 } }));
        expect(w.find('text-fragment').exists()).toBe(true);
    });

    it('onVirtualTextClose hides the bar and emits text-changed when the text changed', () => {
        const state = makeState({ showEditReconTextBar: true });
        const w = mountToolbar(state);
        const editor = { any: true } as any;
        w.vm.onVirtualTextClose({ text: 'new', originalText: 'old', editor });
        expect(state.showEditReconTextBar).toBe(false);
        expect(w.emitted()['text-changed']?.[0]).toEqual([{ text: 'new', editor }]);
    });

    it('onVirtualTextClose does not emit when the text is unchanged', () => {
        const state = makeState({ showEditReconTextBar: true });
        const w = mountToolbar(state);
        w.vm.onVirtualTextClose({ text: 'same', originalText: 'same', editor: {} as any });
        expect(state.showEditReconTextBar).toBe(false);
        expect(w.emitted()['text-changed']).toBeUndefined();
    });
});
