import { describe, it, expect, vi, beforeEach } from 'vitest';

// Component-mount unit test for copy-edition-toolbox. Mocks EditionService so
// mounted() can populate variantEditions; exercises the currentEdition getter,
// openCopyEdtion (toggles the modal) and the mounted() filter that keeps only
// private sibling editions (excluding the current one).

const { getManuscriptEditions } = vi.hoisted(() => ({ getManuscriptEditions: vi.fn() }));
vi.mock('@/services/edition', () => ({
    default: class { public getManuscriptEditions = getManuscriptEditions; },
}));
vi.mock('@/models/edition', () => ({
    EditionInfo: class { public id: number; public name: string; public isPublic: boolean;
        public constructor(e: any) { this.id = e.id; this.name = e.name; this.isPublic = e.isPublic; } },
}));

import CopyEditionToolbox from '@/components/toolbars/copy-edition-toolbox.vue';
import { mountComponent } from './helpers/mount';

function mountBox(current: any = { id: 3, manuscriptId: 7 }) {
    return mountComponent(CopyEditionToolbox, {
        state: { editions: { current } },
        stubs: {
            toolbox: true, 'b-button': true, 'b-dropdown': true,
            'b-dropdown-item-button': true, 'b-dropdown-divider': true,
            'router-link': true, 'copy-edition-modal': true,
        },
    });
}

describe('copy-edition-toolbox', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        getManuscriptEditions.mockResolvedValue({ editions: [] });
    });

    it('currentEdition reflects the state slice', () => {
        const w = mountBox({ id: 5, manuscriptId: 1 });
        expect(w.vm.currentEdition.id).toBe(5);
    });

    it('openCopyEdtion opens the copy modal via v-model', () => {
        const w = mountBox();
        w.vm.openCopyEdtion();
        expect(w.vm.showCopyEditionModal).toBe(true);
    });

    it('mounted() keeps private siblings and drops the current + public ones', async () => {
        getManuscriptEditions.mockResolvedValue({
            editions: [
                [{ id: 3, name: 'self', isPublic: false }],   // current -> excluded
                [{ id: 4, name: 'priv', isPublic: false }],   // kept
                [{ id: 5, name: 'pub', isPublic: true }],     // public -> excluded
                [null],                                        // falsy -> excluded
            ],
        });
        const w = mountBox({ id: 3, manuscriptId: 7 });
        await (w.vm as any).$nextTick();
        await Promise.resolve();
        expect(getManuscriptEditions).toHaveBeenCalledWith(7);
        expect(w.vm.variantEditions.map((e: any) => e.id)).toEqual([4]);
    });

    it('mounted() does nothing when there is no current edition', async () => {
        const w = mountBox(null);
        await (w.vm as any).$nextTick();
        expect(getManuscriptEditions).not.toHaveBeenCalled();
        expect(w.vm.variantEditions).toEqual([]);
    });
});
