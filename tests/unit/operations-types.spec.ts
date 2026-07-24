import { describe, it, expect, beforeEach } from 'vitest';
import {
    ArtefactEditorParams,
    ScrollEditorParams,
} from '@/views/artefact-editor/types';

describe('ArtefactEditorParams', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('has default zoom/rotationAngle and empty image settings', () => {
        const p = new ArtefactEditorParams();
        expect(p.zoom).toBe(0.15);
        expect(p.rotationAngle).toBe(0);
        expect(p.imageSettings).toEqual({});
    });

    it('reads fontSize from localStorage when present', () => {
        localStorage.setItem('font-size', '24');
        const p = new ArtefactEditorParams();
        expect(p.fontSize).toBe(24);
    });

    it('defaults fontSize to 12 when localStorage is empty', () => {
        const p = new ArtefactEditorParams();
        expect(p.fontSize).toBe(12);
    });
});

describe('ScrollEditorParams', () => {
    it('extends ArtefactEditorParams and overrides zoom + adds mode defaults', () => {
        const p = new ScrollEditorParams();
        expect(p).toBeInstanceOf(ArtefactEditorParams);
        expect(p.zoom).toBe(0.1); // overridden
        expect(p.mode).toBe('');
        expect(p.move).toBe(5);
        expect(p.scale).toBe(5);
        expect(p.rotate).toBe(45);
        expect(p.rotationAngle).toBe(0); // inherited
    });
});
