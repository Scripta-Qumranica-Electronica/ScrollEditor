import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StateManager } from '@/state';

vi.mock('@/services/comm-helper', () => ({
    CommHelper: {
        get: vi.fn(),
        put: vi.fn(),
        post: vi.fn(),
        delete: vi.fn(),
    },
}));

import { VirtualArtefactEditor } from '@/services/virtual-artefact';

const st = StateManager.instance;

// The VirtualArtefactEditor constructor is deeply entangled (it needs a fully
// populated script with glyph/kerning data plus a real artefact whose ROIs and
// sign-interpretations are in lock-step). We therefore only cover the reachable
// guard clause: construction is rejected when the current edition has no script.
describe('VirtualArtefactEditor', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        st.editions.items = [];
    });

    it('throws when the current edition has no script', () => {
        const edition = { id: 100, script: null } as any;
        st.editions.items = [edition];
        st.editions.current = edition;

        expect(
            () => new VirtualArtefactEditor({ editionId: 100 } as any)
        ).toThrow(/Can't edit a virtual artefact with no script/);
    });

    it('throws when there is no current edition at all', () => {
        st.editions.current = null;
        expect(
            () => new VirtualArtefactEditor({ editionId: 100 } as any)
        ).toThrow(/Can't edit a virtual artefact with no script/);
    });
});
