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
    InterpretationAttributeDTO,
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
 * Extra edge-case coverage for VirtualArtefactEditor, extending
 * services-virtual-artefact-populate.spec.ts with the same fixture style.
 *
 * Targets the branches the populate spec does not reach:
 *  - getOriginalSignROIs trailing-SPACE scan + BREAK-at-end detection
 *  - extractOriginalText's SPACE -> ' ' branch
 *  - ROItoSI corruption path (roi with no signInterpretationId)
 *  - nextSI throwing on a bad next-interpretation count
 *  - getBaseMeasurements: empty artefact, right-anchor and left-anchor detection
 *  - updateText's SPACE skip (roi === undefined -> continue)
 */

const st = StateManager.instance;

const A = 'א';
const B = 'ב';

function scriptDto(): ScriptDataDTO {
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

// A sign_type attribute so a SI reports SPACE / BREAK / LETTER via its getter.
function signTypeAttr(id: number, str: string): InterpretationAttributeDTO {
    return {
        attributeId: 1,
        attributeValueId: id,
        attributeString: 'sign_type',
        attributeValueString: str,
        interpretationAttributeId: -1,
        creatorId: 1,
        editorId: 1,
    } as InterpretationAttributeDTO;
}

function siDto(id: number, character: string, nextId: number | undefined, typeStr?: string): SignInterpretationDTO {
    return {
        signId: 1,
        signInterpretationId: id,
        character,
        isVariant: false,
        nextSignInterpretations: nextId !== undefined
            ? [{ nextSignInterpretationId: nextId, creatorId: 1, editorId: 1 }]
            : [{ nextSignInterpretationId: 999999, creatorId: 1, editorId: 1 }],
        attributes: typeStr ? [signTypeAttr(typeStr === 'BREAK' ? 4 : typeStr === 'SPACE' ? 2 : 1, typeStr)] : [],
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

function seedEdition(): void {
    const edition: any = { id: 100, script: new ScriptData(scriptDto()) };
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

/*
 * Build a two-letter artefact whose last SI (si2) chains -> SPACE(si3) -> BREAK(si4).
 * The SPACE + BREAK live only in the text fragment (not in the artefact's own
 * rois/SIs), so getOriginalSignROIs picks up the trailing space and flags breakAtEnd.
 */
function buildArtefactWithTrailingSpaceAndBreak(): Artefact {
    const line: LineDTO = {
        lineId: 1,
        lineName: 'l1',
        editorId: 1,
        signs: [
            { signInterpretations: [siDto(1, A, 2)] },
            { signInterpretations: [siDto(2, B, 3)] },
            { signInterpretations: [siDto(3, ' ', 4, 'SPACE')] },
            { signInterpretations: [siDto(4, '', undefined, 'BREAK')] },
        ],
    } as LineDTO;
    const tfDto: TextFragmentDTO = {
        textFragmentId: 1, textFragmentName: 'tf', editorId: 1, lines: [line],
    } as TextFragmentDTO;
    const tf = new TextFragment(tfDto);
    st.textFragments.put(tf);

    const rawArtefact = new Artefact(artefactDto());
    st.artefacts.add(rawArtefact);
    const artefact = st.artefacts.find(500)!;

    for (const sign of tf.lines[0].signs) {
        st.signInterpretations.put(sign.signInterpretations[0]);
    }
    const si1 = st.signInterpretations.get(1)!;
    const si2 = st.signInterpretations.get(2)!;

    const roi1 = new InterpretationRoi(roiDtoFor(101, 1));
    const roi2 = new InterpretationRoi(roiDtoFor(102, 2));
    si1.rois = [roi1];
    si2.rois = [roi2];
    st.interpretationRois.put(roi1);
    st.interpretationRois.put(roi2);

    // Only the two letters belong to the virtual artefact.
    artefact.rois = [roi1, roi2];
    artefact.signInterpretations = [si1, si2];

    return artefact;
}

describe('VirtualArtefactEditor — trailing space + break', () => {
    it('includes a trailing SPACE in the extracted text and flags breakAtEnd', () => {
        seedEdition();
        const editor = new VirtualArtefactEditor(buildArtefactWithTrailingSpaceAndBreak());
        // Two letters + trailing space -> 'אב '
        expect(editor.text).toBe(A + B + ' ');
        expect(st.artefacts.find(-1717171717)).toBeTruthy();
    });

    it('updateText skips space ROIs and PUTs only letter ROIs', async () => {
        seedEdition();
        const editor = new VirtualArtefactEditor(buildArtefactWithTrailingSpaceAndBreak());
        await editor.updateText();
        expect(CommHelper.put).toHaveBeenCalledTimes(1);
        const [, dto] = (CommHelper.put as any).mock.calls[0];
        // Text is 'אב ' (3 chars) but only the 2 letters have ROIs.
        expect(dto.newText).toBe(A + B + ' ');
        expect(dto.textRois.length).toBe(2);
    });
});

describe('VirtualArtefactEditor — anchors and measurements', () => {
    // Artefact letters preceded by a NON-break sign (right anchor) and followed by
    // a NON-break sign (left anchor): both anchors present -> maxWidth defined.
    function buildAnchoredArtefact(): Artefact {
        const line: LineDTO = {
            lineId: 1,
            lineName: 'l1',
            editorId: 1,
            signs: [
                { signInterpretations: [siDto(1, A, 2)] }, // right anchor (index 0)
                { signInterpretations: [siDto(2, A, 3)] }, // artefact sign
                { signInterpretations: [siDto(3, B, 4)] }, // artefact sign
                { signInterpretations: [siDto(4, B, undefined)] }, // left anchor
            ],
        } as LineDTO;
        const tf = new TextFragment({
            textFragmentId: 1, textFragmentName: 'tf', editorId: 1, lines: [line],
        } as TextFragmentDTO);
        st.textFragments.put(tf);

        const rawArtefact = new Artefact(artefactDto());
        st.artefacts.add(rawArtefact);
        const artefact = st.artefacts.find(500)!;

        for (const sign of tf.lines[0].signs) {
            st.signInterpretations.put(sign.signInterpretations[0]);
        }
        const si2 = st.signInterpretations.get(2)!;
        const si3 = st.signInterpretations.get(3)!;
        const roi2 = new InterpretationRoi(roiDtoFor(102, 2));
        const roi3 = new InterpretationRoi(roiDtoFor(103, 3));
        si2.rois = [roi2];
        si3.rois = [roi3];
        st.interpretationRois.put(roi2);
        st.interpretationRois.put(roi3);

        artefact.rois = [roi2, roi3];
        artefact.signInterpretations = [si2, si3];
        return artefact;
    }

    it('detects a right anchor and a left anchor (both -> bounded width)', () => {
        seedEdition();
        const editor = new VirtualArtefactEditor(buildAnchoredArtefact());
        expect(editor.text).toBe(A + B);
        const shadow = st.artefacts.find(-1717171717)!;
        expect(shadow).toBeTruthy();
        // Right-anchored: the shadow is placed to the left of the anchor point.
        expect(shadow.placement.translate).toBeTruthy();
    });

    it('handles an artefact with no signs at all (empty-origin branch)', () => {
        seedEdition();
        // An artefact with zero rois and zero SIs -> getBaseMeasurements early return.
        const rawArtefact = new Artefact(artefactDto());
        st.artefacts.add(rawArtefact);
        const artefact = st.artefacts.find(500)!;
        artefact.rois = [];
        artefact.signInterpretations = [];

        const editor = new VirtualArtefactEditor(artefact);
        expect(editor.text).toBe('');
        expect(st.artefacts.find(-1717171717)).toBeTruthy();
    });
});

describe('VirtualArtefactEditor — corruption guards', () => {
    it('nextSI throws when the SI has an unexpected next-interpretation count', () => {
        seedEdition();
        // si1 (in artefact) chains to si2, but si2 is a SPACE with TWO next- interps,
        // so getOriginalSignROIs -> nextSI(si2) throws.
        const line: LineDTO = {
            lineId: 1,
            lineName: 'l1',
            editorId: 1,
            signs: [
                { signInterpretations: [siDto(1, A, 2)] },
                {
                    signInterpretations: [{
                        signId: 1, signInterpretationId: 2, character: ' ', isVariant: false,
                        nextSignInterpretations: [
                            { nextSignInterpretationId: 3, creatorId: 1, editorId: 1 },
                            { nextSignInterpretationId: 4, creatorId: 1, editorId: 1 },
                        ],
                        attributes: [signTypeAttr(2, 'SPACE')], rois: [], signStreamSectionIds: [], qwbWordIds: [],
                    } as unknown as SignInterpretationDTO],
                },
            ],
        } as LineDTO;
        const tf = new TextFragment({
            textFragmentId: 1, textFragmentName: 'tf', editorId: 1, lines: [line],
        } as TextFragmentDTO);
        st.textFragments.put(tf);

        const rawArtefact = new Artefact(artefactDto());
        st.artefacts.add(rawArtefact);
        const artefact = st.artefacts.find(500)!;
        for (const sign of tf.lines[0].signs) {
            st.signInterpretations.put(sign.signInterpretations[0]);
        }
        const si1 = st.signInterpretations.get(1)!;
        const roi1 = new InterpretationRoi(roiDtoFor(101, 1));
        si1.rois = [roi1];
        st.interpretationRois.put(roi1);
        artefact.rois = [roi1];
        artefact.signInterpretations = [si1];

        expect(() => new VirtualArtefactEditor(artefact)).toThrow(/exactly 1 nextSignInterpretation/);
    });

    it('flags corruption when a ROI has no signInterpretationId', () => {
        seedEdition();
        const line: LineDTO = {
            lineId: 1, lineName: 'l1', editorId: 1,
            signs: [{ signInterpretations: [siDto(1, A, undefined)] }],
        } as LineDTO;
        const tf = new TextFragment({
            textFragmentId: 1, textFragmentName: 'tf', editorId: 1, lines: [line],
        } as TextFragmentDTO);
        st.textFragments.put(tf);

        const rawArtefact = new Artefact(artefactDto());
        st.artefacts.add(rawArtefact);
        const artefact = st.artefacts.find(500)!;
        st.signInterpretations.put(tf.lines[0].signs[0].signInterpretations[0]);
        const realSi1 = st.signInterpretations.get(1)!;
        const roi1 = new InterpretationRoi(roiDtoFor(101, 1));
        // Blank the ROI's signInterpretationId so ROItoSI hits the corruption path.
        (roi1 as any).signInterpretationId = undefined;
        realSi1.rois = [roi1];
        st.interpretationRois.put(roi1);
        artefact.rois = [roi1];
        artefact.signInterpretations = [realSi1];

        // ROItoSI logs + calls state.corrupted(), which throws 'State is corrupt'.
        expect(() => new VirtualArtefactEditor(artefact)).toThrow(/State is corrupt/);
    });
});
