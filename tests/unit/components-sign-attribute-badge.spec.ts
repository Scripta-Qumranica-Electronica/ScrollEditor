import { describe, it, expect } from 'vitest';

// Component-mount unit test for sign-attribute-badge. Exercises the
// artefactEditorState passthrough and the isHighlighted computed (true only when
// comment-highlight mode is on and the attribute carries commentary).

import SignAttributeBadge from '@/components/sign-attributes/sign-attribute-badge.vue';
import { mountComponent } from './helpers/mount';

function mountBadge(attribute: any, highlightCommentMode: boolean) {
    return mountComponent(SignAttributeBadge, {
        props: { attribute },
        state: { artefactEditor: { highlightCommentMode } },
        stubs: { 'b-badge': true },
    });
}

describe('sign-attribute-badge', () => {
    it('artefactEditorState exposes the artefact-editor state slice', () => {
        const w = mountBadge({ attributeString: 'x', attributeValueString: 'y' }, false);
        expect(w.vm.artefactEditorState.highlightCommentMode).toBe(false);
    });

    it('isHighlighted is false when highlight mode is off', () => {
        const w = mountBadge({ commentary: 'note' }, false);
        expect(w.vm.isHighlighted).toBe(false);
    });

    it('isHighlighted is false when the attribute has no commentary', () => {
        const w = mountBadge({ commentary: '' }, true);
        expect(w.vm.isHighlighted).toBe(false);
    });

    it('isHighlighted is true with highlight mode on and commentary present', () => {
        const w = mountBadge({ commentary: 'note' }, true);
        expect(w.vm.isHighlighted).toBe(true);
    });
});
