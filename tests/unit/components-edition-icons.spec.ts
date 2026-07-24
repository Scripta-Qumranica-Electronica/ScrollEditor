import { describe, it, expect } from 'vitest';

// Component-mount unit test for edition-icons: exercises the readOnly and shared
// computed props derived from the edition prop (readOnly from the permission,
// shared when >1 share still has read permission).

import EditionIcons from '@/components/cues/edition-icons.vue';
import { mountComponent } from './helpers/mount';

function makeEdition(readOnly: boolean, shares: Array<{ mayRead: boolean }>) {
    return {
        permission: { readOnly },
        shares: shares.map(s => ({ permissions: { mayRead: s.mayRead } })),
    };
}

function mountIcons(edition: any) {
    return mountComponent(EditionIcons, {
        props: { edition },
        stubs: { 'b-badge': true },
    });
}

describe('edition-icons', () => {
    it('readOnly reflects the edition permission', () => {
        expect(mountIcons(makeEdition(true, [])).vm.readOnly).toBe(true);
        expect(mountIcons(makeEdition(false, [])).vm.readOnly).toBe(false);
    });

    it('shared is false with a single reader (owner only)', () => {
        const w = mountIcons(makeEdition(false, [{ mayRead: true }]));
        expect(w.vm.shared).toBe(false);
    });

    it('shared is true when more than one share still has read permission', () => {
        const w = mountIcons(makeEdition(false, [{ mayRead: true }, { mayRead: true }]));
        expect(w.vm.shared).toBe(true);
    });

    it('revoked (mayRead=false) shares do not count toward shared', () => {
        const w = mountIcons(makeEdition(false, [{ mayRead: true }, { mayRead: false }]));
        expect(w.vm.shared).toBe(false);
    });
});
