import { describe, it, expect } from 'vitest';
import { ImagedObjectState } from '@/state/imaged-object';
import { ImagedObjectEditorParams } from '@/views/imaged-object-editor/types';

describe('ImagedObjectState', () => {
    it('constructs with default params', () => {
        const s = new ImagedObjectState();
        expect(s.params).toBeInstanceOf(ImagedObjectEditorParams);
    });

    it('params can be replaced', () => {
        const s = new ImagedObjectState();
        const p = new ImagedObjectEditorParams();
        s.params = p;
        expect(s.params).toBe(p);
    });

    it('params can be nulled out', () => {
        const s = new ImagedObjectState();
        s.params = null;
        expect(s.params).toBeNull();
    });
});
