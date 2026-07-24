import { describe, it, expect, vi, beforeEach } from 'vitest';

// Component-mount unit test for the comment component. Exercises the
// view/edit/delete handlers, onCommentUpdated emit, and the modal-visibility
// booleans. CKEditor is stubbed via the <ckeditor> component stub; the build
// module is mocked so importing the component doesn't pull in the heavy editor.
vi.mock('@ckeditor/ckeditor5-build-classic', () => ({ default: {} }));

import Comment from '@/components/comment/comment.vue';
import { mountComponent } from './helpers/mount';

function makeState(readOnly = false) {
    return {
        editions: { current: { permission: { readOnly } } },
    };
}

function mountComment(over: { readOnly?: boolean; comment?: string } = {}) {
    return mountComponent(Comment, {
        state: makeState(over.readOnly ?? false),
        props: { modelValue: over.comment ?? 'hello world' },
        stubs: {
            'b-button': true,
            'b-modal': true,
            ckeditor: true,
        },
    });
}

describe('comment', () => {
    beforeEach(() => vi.clearAllMocks());

    it('mounts and seeds comment from modelValue', () => {
        const w = mountComment({ comment: 'seeded' });
        expect(w.exists()).toBe(true);
        expect(w.vm.comment).toBe('seeded');
    });

    it('readOnly reflects the edition permission', () => {
        expect(mountComment({ readOnly: true }).vm.readOnly).toBe(true);
        expect(mountComment({ readOnly: false }).vm.readOnly).toBe(false);
    });

    it('commentDisplay returns None for empty and shortens long comments', () => {
        const w = mountComment({ comment: '' });
        expect(w.vm.commentDisplay).toBe('None');

        const long = mountComment({ comment: 'abcdefghijklmnop' });
        expect(long.vm.commentDisplay).toBe('abcdefghij...');

        const short = mountComment({ comment: 'abc' });
        expect(short.vm.commentDisplay).toBe('abc');
    });

    it('onViewComment shows the view modal', () => {
        const w = mountComment();
        expect(w.vm.viewCommentVisible).toBe(false);
        w.vm.onViewComment();
        expect(w.vm.viewCommentVisible).toBe(true);
    });

    it('onEditComment shows the edit modal', () => {
        const w = mountComment();
        expect(w.vm.editCommentVisible).toBe(false);
        w.vm.onEditComment();
        expect(w.vm.editCommentVisible).toBe(true);
    });

    it('onCommentUpdated emits update:modelValue with the current comment', () => {
        const w = mountComment({ comment: 'x' });
        w.vm.comment = 'edited';
        w.vm.onCommentUpdated();
        const emitted = w.emitted('update:modelValue');
        expect(emitted).toBeTruthy();
        expect(emitted![emitted!.length - 1]).toEqual(['edited']);
    });

    it('onDeleteComment clears the comment and emits the update', () => {
        const w = mountComment({ comment: 'to-delete' });
        w.vm.onDeleteComment();
        expect(w.vm.comment).toBe('');
        const emitted = w.emitted('update:modelValue');
        expect(emitted).toBeTruthy();
        expect(emitted![emitted!.length - 1]).toEqual(['']);
    });

    it('onValueChanged (modelValue watcher) syncs comment, falling back to empty', async () => {
        const w = mountComment({ comment: 'first' });
        await w.setProps({ modelValue: 'second' });
        expect(w.vm.comment).toBe('second');
        await w.setProps({ modelValue: undefined as any });
        expect(w.vm.comment).toBe('');
    });
});
