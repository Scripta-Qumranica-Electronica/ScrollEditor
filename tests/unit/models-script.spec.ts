import { describe, it, expect } from 'vitest';
import { GlyphData, ScriptData } from '@/models/script';
import type { GlyphDataDTO, KernPairDTO, ScriptDataDTO } from '@/dtos/sqe-dtos';

function makeGlyphDto(over: Partial<GlyphDataDTO> = {}): GlyphDataDTO {
    return {
        character: 'a',
        shape: 'POLYGON((0 0,10 0,10 20,0 20,0 0))',
        yOffset: 5,
        creatorId: 1,
        editorId: 1,
        scribalFontId: 1,
        ...over,
    };
}

function makeKernDto(over: Partial<KernPairDTO> = {}): KernPairDTO {
    return {
        firstCharacter: 'a',
        secondCharacter: 'b',
        xKern: 3,
        yKern: -2,
        creatorId: 1,
        editorId: 1,
        scribalFontId: 1,
        ...over,
    };
}

function makeScriptDto(over: Partial<ScriptDataDTO> = {}): ScriptDataDTO {
    return {
        wordSpace: 10,
        lineSpace: 20,
        creatorId: 1,
        editorId: 1,
        scribalFontId: 1,
        glyphs: [makeGlyphDto()],
        kerningPairs: [makeKernDto()],
        ...over,
    };
}

describe('script — GlyphData', () => {
    it('constructs from DTO and stores character / yOffset', () => {
        const g = new GlyphData(makeGlyphDto({ character: 'x', yOffset: 7 }));
        expect(g.character).toBe('x');
        expect(g.yOffset).toBe(7);
    });

    it('parses the shape into a Polygon and computes a bounding box', () => {
        const g = new GlyphData(makeGlyphDto());
        expect(g.shape.wkt).toContain('POLYGON');
        expect(g.boundingBox.width).toBe(10);
        expect(g.boundingBox.height).toBe(20);
    });
});

describe('script — ScriptData', () => {
    it('constructs from a DTO with glyphs and kerning', () => {
        const s = new ScriptData(makeScriptDto());
        expect(s.wordSpace).toBe(10);
        expect(s.lineSpace).toBe(20);
        expect(s.glyphs['a']).toBeInstanceOf(GlyphData);
    });

    it('indexes glyphs by character', () => {
        const s = new ScriptData(makeScriptDto({
            glyphs: [makeGlyphDto({ character: 'a' }), makeGlyphDto({ character: 'b' })],
        }));
        expect(Object.keys(s.glyphs).sort()).toEqual(['a', 'b']);
        expect(s.glyphs['b'].character).toBe('b');
    });

    it('throws if no glyphs are provided', () => {
        const dto = makeScriptDto();
        delete (dto as any).glyphs;
        expect(() => new ScriptData(dto)).toThrow(/no glyph information/);
    });

    it('getKerning returns the pair for a known char pair', () => {
        const s = new ScriptData(makeScriptDto());
        const k = s.getKerning('a', 'b');
        expect(k).toBeDefined();
        expect(k!.xKern).toBe(3);
        expect(k!.yKern).toBe(-2);
    });

    it('getKerning returns undefined for an unknown pair', () => {
        const s = new ScriptData(makeScriptDto());
        expect(s.getKerning('z', 'q')).toBeUndefined();
    });

    it('handles a DTO with no kerning pairs', () => {
        const dto = makeScriptDto();
        delete (dto as any).kerningPairs;
        const s = new ScriptData(dto);
        expect(s.getKerning('a', 'b')).toBeUndefined();
    });
});
