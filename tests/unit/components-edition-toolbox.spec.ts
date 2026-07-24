import { describe, it, expect, vi, beforeEach } from 'vitest';

// Component-mount unit test for edition-toolbox. Mocks modal-bus; child modals
// and toolbox are stubbed. Exercises openMetadata / openCopyrightInfo which each
// open a modal via showModal.

const { showModal } = vi.hoisted(() => ({ showModal: vi.fn() }));
vi.mock('@/utils/modal-bus', () => ({ showModal }));

import EditionToolbox from '@/components/toolbars/edition-toolbox.vue';
import { mountComponent } from './helpers/mount';

function mountBox() {
    return mountComponent(EditionToolbox, {
        stubs: {
            toolbox: true, 'b-button': true,
            'edition-metadata-modal': true, 'edition-copyright-info-modal': true,
        },
    });
}

describe('edition-toolbox', () => {
    beforeEach(() => vi.clearAllMocks());

    it('openMetadata opens the metadata modal', () => {
        mountBox().vm.openMetadata();
        expect(showModal).toHaveBeenCalledWith('editionMetadataModal');
    });

    it('openCopyrightInfo opens the copyright modal', () => {
        mountBox().vm.openCopyrightInfo();
        expect(showModal).toHaveBeenCalledWith('editionCopyrightInfoModal');
    });
});
