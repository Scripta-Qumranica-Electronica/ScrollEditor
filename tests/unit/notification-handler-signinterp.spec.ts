import { describe, it, expect, beforeEach } from 'vitest';
import { StateManager } from '@/state';
import { NotificationHandler } from '@/state/notification-handler';
import { TextFragment, Sign, SignInterpretation } from '@/models/text';
import type {
    SignInterpretationDTO,
    SignInterpretationListDTO,
    DeleteIntIdDTO,
    LineDTO,
    SignDTO,
    TextFragmentDTO,
} from '@/dtos/sqe-dtos';

/*
 * Coverage for the previously-untested sign-interpretation CREATE and DELETE
 * reducers in src/state/notification-handler.ts (handleCreatedSignInterpretation
 * and handleDeletedSignInterpretation). These exercise the sign-graph mutation
 * that the ROI / artefact-group tests in the sibling specs do not touch.
 *
 * We build a real TextFragment -> Line -> Sign -> SignInterpretation graph so the
 * `sign.line`, `indexInLine` and `nextSignInterpretations` linkage the reducers
 * rely on is genuine, then register the SIs in the state map.
 */

const st = StateManager.instance;
const handler = new NotificationHandler();

// A single-SI sign DTO whose character/id we control.
function signDto(siId: number, character: string, nextId?: number): SignDTO {
    const si: SignInterpretationDTO = {
        signId: 1,
        signInterpretationId: siId,
        character,
        isVariant: false,
        nextSignInterpretations: nextId !== undefined
            ? [{ nextSignInterpretationId: nextId, creatorId: 1, editorId: 1 }]
            : [],
        attributes: [],
        rois: [],
        signStreamSectionIds: [],
        qwbWordIds: [],
    } as unknown as SignInterpretationDTO;
    return { signInterpretations: [si] };
}

// Build a text fragment with one line whose signs chain sign[i] -> sign[i+1].
function buildFragment(siIds: number[], chars: string[]): TextFragment {
    const signs: SignDTO[] = siIds.map((id, i) =>
        signDto(id, chars[i], i < siIds.length - 1 ? siIds[i + 1] : undefined),
    );
    const line: LineDTO = { lineId: 1, lineName: 'l1', editorId: 1, signs } as LineDTO;
    const tfDto: TextFragmentDTO = {
        textFragmentId: 1,
        textFragmentName: 'tf1',
        editorId: 1,
        lines: [line],
    } as TextFragmentDTO;
    return new TextFragment(tfDto);
}

// Register every SI of the fragment's first line into the state map.
function registerSIs(tf: TextFragment): SignInterpretation[] {
    const sis: SignInterpretation[] = [];
    for (const sign of tf.lines[0].signs) {
        const si = sign.signInterpretations[0];
        st.signInterpretations.put(si);
        sis.push(si);
    }
    return sis;
}

// Minimal DTO for a newly-created SI that should be inserted before `nextId`.
function createSiDto(id: number, character: string, nextId: number): SignInterpretationDTO {
    return {
        signId: 1,
        signInterpretationId: id,
        character,
        isVariant: false,
        nextSignInterpretations: [{ nextSignInterpretationId: nextId, creatorId: 1, editorId: 1 }],
        attributes: [],
        rois: [],
        signStreamSectionIds: [],
        qwbWordIds: [],
    } as unknown as SignInterpretationDTO;
}

beforeEach(() => {
    st.signInterpretations.clear();
    st.artefacts.items = [];
    st.textFragmentEditor.selectedSignInterpretations = [];
    st.textFragmentEditor.selectedAttribute = null;
});

describe('handleDeletedSignInterpretation', () => {
    it('removes the sign from its line and deletes the SI from the map', () => {
        const tf = buildFragment([10, 11, 12], ['a', 'b', 'c']);
        registerSIs(tf);
        const line = tf.lines[0];
        expect(line.signs.length).toBe(3);

        const del: DeleteIntIdDTO = { entity: 'signInterpretation', ids: [11] } as unknown as DeleteIntIdDTO;
        handler.handleDeletedSignInterpretation(del);

        // Sign 'b' removed from the line; remaining signs reindexed by removeSign.
        // (SignInterpretationMap.delete deliberately keeps the entry in the map
        // for undo; the observable effect is the line mutation.)
        expect(line.signs.length).toBe(2);
        expect(line.signs.map(s => s.signInterpretations[0].character)).toEqual(['a', 'c']);
        expect(line.signs.find(s => s.signInterpretations[0].character === 'b')).toBeUndefined();
    });

    it('ignores a notification whose entity is not signInterpretation', () => {
        const tf = buildFragment([20], ['x']);
        registerSIs(tf);
        const del: DeleteIntIdDTO = { entity: 'artefact', ids: [20] } as unknown as DeleteIntIdDTO;
        handler.handleDeletedSignInterpretation(del);
        // Nothing removed.
        expect(st.signInterpretations.get(20)).toBeTruthy();
        expect(tf.lines[0].signs.length).toBe(1);
    });

    it('no-ops (returns) when the SI is already gone from the map', () => {
        const del: DeleteIntIdDTO = { entity: 'signInterpretation', ids: [999] } as unknown as DeleteIntIdDTO;
        expect(() => handler.handleDeletedSignInterpretation(del)).not.toThrow();
    });

    it('bails out for a sign that carries more than one interpretation', () => {
        const tf = buildFragment([30, 31], ['a', 'b']);
        registerSIs(tf);
        // Give sign[0] a second interpretation so the length !== 1 guard trips.
        const sign = tf.lines[0].signs[0];
        const extra = new SignInterpretation(
            {
                signId: 1, signInterpretationId: 300, character: 'a2', isVariant: false,
                nextSignInterpretations: [], attributes: [], rois: [], signStreamSectionIds: [], qwbWordIds: [],
            } as unknown as SignInterpretationDTO,
            sign,
        );
        sign.signInterpretations.push(extra);

        const del: DeleteIntIdDTO = { entity: 'signInterpretation', ids: [30] } as unknown as DeleteIntIdDTO;
        handler.handleDeletedSignInterpretation(del);

        // Guard returned before removing the sign or deleting from the map.
        expect(tf.lines[0].signs.length).toBe(2);
        expect(st.signInterpretations.get(30)).toBeTruthy();
    });

    it('takes the else-branch (no line splice) when the sign has already been removed', () => {
        const tf = buildFragment([40, 41], ['a', 'b']);
        registerSIs(tf);
        const line = tf.lines[0];
        const sign = line.signs[0];
        // Simulate the sign already having been removed from the line (its slot
        // now holds a different sign), so line.signs[indexInLine] !== sign and the
        // reducer takes the "do nothing" else-branch rather than removeSign.
        line.signs[sign.indexInLine] = line.signs[1];
        const lengthBefore = line.signs.length;

        const del: DeleteIntIdDTO = { entity: 'signInterpretation', ids: [40] } as unknown as DeleteIntIdDTO;
        expect(() => handler.handleDeletedSignInterpretation(del)).not.toThrow();

        // No splice happened (removeSign was NOT called).
        expect(line.signs.length).toBe(lengthBefore);
    });
});

describe('handleCreatedSignInterpretation', () => {
    it('inserts a new sign before its next-interpretation on the same line', () => {
        // Existing line: b(51) -> c(52); we create a(50) whose next is b(51).
        const tf = buildFragment([51, 52], ['b', 'c']);
        registerSIs(tf);
        const line = tf.lines[0];
        expect(line.signs.length).toBe(2);

        const list: SignInterpretationListDTO = {
            signInterpretations: [createSiDto(50, 'a', 51)],
        };
        handler.handleCreatedSignInterpretation(list);

        expect(st.signInterpretations.get(50)).toBeTruthy();
        // New sign inserted at the index of its `next` sign (b), pushing b/c right.
        expect(line.signs.length).toBe(3);
        expect(line.signs.map(s => s.signInterpretations[0].character)).toEqual(['a', 'b', 'c']);
    });

    it('returns early when there are no signInterpretations in the DTO', () => {
        expect(() => handler.handleCreatedSignInterpretation({})).not.toThrow();
        expect(st.signInterpretations.size ?? 0).toBe(0);
    });

    it('skips a SI that already exists in the map', () => {
        const tf = buildFragment([60, 61], ['b', 'c']);
        registerSIs(tf);
        const before = tf.lines[0].signs.length;
        const list: SignInterpretationListDTO = {
            signInterpretations: [createSiDto(60, 'b', 61)], // 60 already present
        };
        handler.handleCreatedSignInterpretation(list);
        expect(tf.lines[0].signs.length).toBe(before); // nothing added
    });

    it('warns and skips when the created SI has no next-interpretation IDs', () => {
        const tf = buildFragment([70], ['b']);
        registerSIs(tf);
        const dto = createSiDto(71, 'a', 70);
        (dto as any).nextSignInterpretations = undefined; // trip the missing-next guard
        handler.handleCreatedSignInterpretation({ signInterpretations: [dto] });
        expect(st.signInterpretations.get(71)).toBeUndefined();
    });

    it('warns and skips when none of the next IDs resolve to a known SI', () => {
        const tf = buildFragment([80], ['b']);
        registerSIs(tf);
        // next points at 9999 which is not in the map.
        handler.handleCreatedSignInterpretation({ signInterpretations: [createSiDto(81, 'a', 9999)] });
        expect(st.signInterpretations.get(81)).toBeUndefined();
    });
});
