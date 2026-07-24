import { describe, it, expect } from 'vitest';

// Component-mount unit test for Faq-modal: verifies the initial hidden state and
// that show() reveals the modal.

import FaqModal from '@/components/navigation/Faq-modal.vue';
import { mountComponent } from './helpers/mount';

function mountFaq() {
    return mountComponent(FaqModal, {
        stubs: { 'b-modal': true, 'b-row': true, 'b-col': true, 'b-container': true },
    });
}

describe('Faq-modal', () => {
    it('starts hidden', () => {
        expect(mountFaq().vm.visible).toBe(false);
    });

    it('show() reveals the modal', () => {
        const w = mountFaq();
        w.vm.show();
        expect(w.vm.visible).toBe(true);
    });
});
