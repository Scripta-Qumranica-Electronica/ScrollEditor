/* This file contains types describing the manuscript's script */

import { GlyphDataDTO, KernPairDTO, ScriptDataDTO } from '@/dtos/sqe-dtos';
import { Polygon } from '@/utils/Polygons';

// Glyphs is a  dictionary for how to display a letter
// where shape can used in SVG <path> tag
export class GlyphData {
    public character: string;
    public yOffset: number;
    public shape: Polygon;

    constructor(dto: GlyphDataDTO) {
        this.character = dto.character;
        this.yOffset = dto.yOffset;
        this.shape = Polygon.fromWkt(dto.shape);
    }
}

export class ScriptData {
    public glyphs: { [key: string]: GlyphData } = {};
    private kerning = new Map<string, KernPairDTO>();  // Key is encoded - char1-char2, as tuples can't serve as keys
    public wordSpace: number;
    public lineSpace: number;

    private getKey(char1: string, char2: string) {
        return `${char1}-${char2}`;
    }

    public constructor(dto: ScriptDataDTO) {
        if (!dto.glyphs) {
            throw new Error("Can't create ScriptData with no glyph information");
        }

        for (const glyph of dto.glyphs) {
            this.glyphs[glyph.character] = new GlyphData(glyph);
        }

        if (dto.kerningPairs) {
            for (const pair of dto.kerningPairs) {
                const key = this.getKey(pair.firstCharacter, pair.secondCharacter);
                this.kerning.set(key, pair);
            }
        }

        this.lineSpace = dto.lineSpace;
        this.wordSpace = dto.wordSpace;
    }

    public getKerning(char1: string, char2: string): KernPairDTO | undefined {
        const key = this.getKey(char1, char2);

        return this.kerning.get(key);
    }
}
