import { describe, it, expect } from 'vitest';

// Component-mount unit test for CitationModal: verifies the initial hidden state
// and that show() reveals the modal.

import CitationModal from '@/components/navigation/CitationModal.vue';
import { mountComponent } from './helpers/mount';

function mountCitation() {
    return mountComponent(CitationModal, {
        stubs: { 'b-modal': true, 'b-row': true, 'b-col': true, 'b-container': true },
    });
}

describe('CitationModal', () => {
    it('starts hidden', () => {
        expect(mountCitation().vm.visible).toBe(false);
    });

    it('show() reveals the modal', () => {
        const w = mountCitation();
        w.vm.show();
        expect(w.vm.visible).toBe(true);
    });
});
