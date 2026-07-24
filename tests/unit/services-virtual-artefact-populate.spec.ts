import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StateManager } from '@/state';
import { Artefact } from '@/models/artefact';
import { ScriptData } from '@/models/script';
import { TextFragment, Sign, SignInterpretation, InterpretationRoi } from '@/models/text';
import type {
    ArtefactDTO,
    ScriptDataDTO,
    TextFragmentDTO,
    LineDTO,
    SignInterpretationDTO,
    InterpretationRoiDTO,
} from '@/dtos/sqe-dtos';

vi.mock('@/services/comm-helper', () => ({
    CommHelper: {
        get: vi.fn(),
        put: vi.fn().mockResolvedValue({ data: {} }),
        post: vi.fn(),
        delete: vi.fn(),
    },
}));

import { VirtualArtefactEditor } from '@/services/virtual-artefact';
import { CommHelper } from '@/services/comm-helper';

/*
 * Deeper coverage for VirtualArtefactEditor. The constructor is heavily entangled
 * (it needs a populated script with glyphs/kerning plus an original artefact whose
 * ROIs and sign-interpretations are in lock-step). We assemble exactly that fixture
 * so the full construction path runs: getOriginalSignROIs -> extractOriginalText ->
 * getBaseMeasurements -> populateShadows (populateShadowSigns/ROIs, calcArtefactWidth,
 * placeShadowArtefact), plus the `text` setter, hide(), and updateText().
 */

const st = StateManager.instance;

const A = 'א';
const B = 'ב';

function scriptDto(): ScriptDataDTO {
    // Two 10x10 glyphs plus a kerning pair between them.
    const boxWkt = 'POLYGON((0 0,10 0,10 10,0 10,0 0))';
    return {
        wordSpace: 8,
        lineSpace: 20,
        creatorId: 1,
        editorId: 1,
        scribalFontId: 1,
        glyphs: [
            { character: A, shape: boxWkt, yOffset: 2, creatorId: 1, editorId: 1, scribalFontId: 1 },
            { character: B, shape: boxWkt, yOffset: 3, creatorId: 1, editorId: 1, scribalFontId: 1 },
        ],
        kerningPairs: [
            { firstCharacter: A, secondCharacter: B, xKern: 2, yKern: 1, creatorId: 1, editorId: 1, scribalFontId: 1 },
        ],
    } as ScriptDataDTO;
}

function artefactDto(over: Partial<ArtefactDTO> = {}): ArtefactDTO {
    return {
        id: 500,
        name: 'virtual',
        editionId: 100,
        imagedObjectId: 'IO-1',
        imageId: 1,
        artefactDataEditorId: 1,
        mask: 'POLYGON((0 0,40 0,40 20,0 20,0 0))',
        artefactMaskEditorId: 1,
        isPlaced: true,
        placement: { scale: 1, rotate: 0, translate: { x: 100, y: 200 }, zIndex: 0, mirrored: false },
        artefactPlacementEditorId: 1,
        side: 'recto',
        statusMessage: '',
        ...over,
    } as ArtefactDTO;
}

function siDto(id: number, character: string, nextId?: number): SignInterpretationDTO {
    return {
        signId: 1,
        signInterpretationId: id,
        character,
        isVariant: false,
        nextSignInterpretations: nextId !== undefined
            ? [{ nextSignInterpretationId: nextId, creatorId: 1, editorId: 1 }]
            : [{ nextSignInterpretationId: 999999, creatorId: 1, editorId: 1 }],
        attributes: [],
        rois: [],
        signStreamSectionIds: [],
        qwbWordIds: [],
    } as unknown as SignInterpretationDTO;
}

function roiDtoFor(roiId: number, siId: number, y = 15): InterpretationRoiDTO {
    return {
        interpretationRoiId: roiId,
        artefactId: 500,
        signInterpretationId: siId,
        shape: 'POLYGON((0 0,10 0,10 10,0 10,0 0))',
        translate: { x: 0, y },
        stanceRotation: 0,
        exceptional: false,
        valuesSet: true,
        creatorId: 1,
        editorId: 1,
    } as unknown as InterpretationRoiDTO;
}

/**
 * Build a two-letter virtual artefact whose ROIs and SIs are in lock-step, wire
 * the SIs into the state map, and return the original artefact ready to edit.
 * chain: si1(A) -> si2(B) -> (dangling id, so nextSI resolves to undefined at the end)
 */
function buildOriginalArtefact(): Artefact {
    const line: LineDTO = {
        lineId: 1,
        lineName: 'l1',
        editorId: 1,
        signs: [
            { signInterpretations: [siDto(1, A, 2)] },
            { signInterpretations: [siDto(2, B)] }, // dangling next -> end of artefact
        ],
    } as LineDTO;
    const tfDto: TextFragmentDTO = {
        textFragmentId: 1, textFragmentName: 'tf', editorId: 1, lines: [line],
    } as TextFragmentDTO;
    const tf = new TextFragment(tfDto);
    st.textFragments.put(tf);

    const rawSi1 = tf.lines[0].signs[0].signInterpretations[0];
    const rawSi2 = tf.lines[0].signs[1].signInterpretations[0];

    const rawArtefact = new Artefact(artefactDto());
    st.artefacts.add(rawArtefact);
    // Read back the reactive-proxy instance the store actually holds; the editor
    // resolves SIs via the state map (which likewise returns proxies), so the
    // artefact's own arrays must reference those SAME proxied instances for the
    // in-lock-step identity checks in getOriginalSignROIs to pass.
    const artefact = st.artefacts.find(500)!;

    st.signInterpretations.put(rawSi1);
    st.signInterpretations.put(rawSi2);
    const si1 = st.signInterpretations.get(1)!;
    const si2 = st.signInterpretations.get(2)!;

    // ROIs, in the same order as the SIs (getOriginalSignROIs requires equal length
    // and roi[i] <-> si[i] correspondence via signInterpretationId).
    const roi1 = new InterpretationRoi(roiDtoFor(101, 1));
    const roi2 = new InterpretationRoi(roiDtoFor(102, 2));
    si1.rois = [roi1];
    si2.rois = [roi2];
    st.interpretationRois.put(roi1);
    st.interpretationRois.put(roi2);

    artefact.rois = [roi1, roi2];
    artefact.signInterpretations = [si1, si2];

    return artefact;
}

function seedEdition(withScript = true): void {
    const edition: any = { id: 100, script: withScript ? new ScriptData(scriptDto()) : null };
    st.editions.items = [edition];
    st.editions.current = edition;
}

beforeEach(() => {
    vi.clearAllMocks();
    st.artefacts.items = [];
    st.editions.items = [];
    st.signInterpretations.clear();
    st.interpretationRois.clear();
});

describe('VirtualArtefactEditor — full construction', () => {
    it('builds shadow models and extracts the original text', () => {
        seedEdition();
        const original = buildOriginalArtefact();
        const editor = new VirtualArtefactEditor(original);

        // Two letters -> extracted text 'אב'.
        expect(editor.text).toBe(A + B);

        // A shadow artefact (id -1717171717) and shadow text fragment were registered.
        expect(st.artefacts.find(-1717171717)).toBeTruthy();
        expect(st.textFragments.get(-1717171717)).toBeTruthy();
    });

    it('re-populates shadows when the text is replaced via the setter', () => {
        seedEdition();
        const original = buildOriginalArtefact();
        const editor = new VirtualArtefactEditor(original);

        const shadow = st.artefacts.find(-1717171717)!;
        editor.text = A + B + A; // longer text -> wider mask
        expect(editor.text).toBe(A + B + A);
        // The shadow artefact was re-placed (mask is a real polygon with width).
        expect(shadow.mask.getBoundingBox().width).toBeGreaterThan(0);
    });

    it('handles a space in the text (SPACE branch of width/ROI logic)', () => {
        seedEdition();
        const original = buildOriginalArtefact();
        const editor = new VirtualArtefactEditor(original);
        editor.text = A + ' ' + B;
        expect(editor.text).toBe(A + ' ' + B);
        // No throw -> the wordSpace / SPACE-skip branches executed.
        expect(st.artefacts.find(-1717171717)).toBeTruthy();
    });

    it('hide() removes the shadow artefact and text fragment', () => {
        seedEdition();
        const original = buildOriginalArtefact();
        const editor = new VirtualArtefactEditor(original);
        expect(st.artefacts.find(-1717171717)).toBeTruthy();

        editor.hide();
        expect(st.artefacts.find(-1717171717)).toBeNull();
        expect(st.textFragments.get(-1717171717)).toBeUndefined();
    });

    it('hide() a second time warns and no-ops', () => {
        seedEdition();
        const editor = new VirtualArtefactEditor(buildOriginalArtefact());
        editor.hide();
        expect(() => editor.hide()).not.toThrow();
    });

    it('updateText() PUTs the reconstruction request with the shadow ROIs', async () => {
        seedEdition();
        const editor = new VirtualArtefactEditor(buildOriginalArtefact());
        await editor.updateText();

        expect(CommHelper.put).toHaveBeenCalledTimes(1);
        const [, dto] = (CommHelper.put as any).mock.calls[0];
        expect(dto.newText).toBe(A + B);
        // Two non-space letters -> two indexed ROIs.
        expect(dto.textRois.length).toBe(2);
        expect(dto.virtualArtefactShape).toContain('POLYGON');
    });
});

describe('VirtualArtefactEditor — guard clauses', () => {
    it('throws when the current edition has no script', () => {
        seedEdition(false);
        expect(() => new VirtualArtefactEditor({ editionId: 100 } as any)).toThrow(
            /Can't edit a virtual artefact with no script/,
        );
    });

    it('throws when ROI and SI counts do not match', () => {
        seedEdition();
        const original = buildOriginalArtefact();
        original.rois = [original.rois[0]]; // now 1 roi vs 2 SIs
        expect(() => new VirtualArtefactEditor(original)).toThrow(/number of ROIs is not the same/);
    });
});
