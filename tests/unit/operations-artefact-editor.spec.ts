import { describe, it, expect, beforeEach, vi } from 'vitest';

// TextService methods hit the network (CommHelper). Stub the whole service so the
// line operations exercise their own logic without any HTTP.
const replaceText = vi.fn();
const createLine = vi.fn();
const deleteLine = vi.fn();
vi.mock('@/services/text', () => ({
    default: class {
        public replaceText = replaceText;
        public createLine = createLine;
        public deleteLine = deleteLine;
    },
}));

import { StateManager } from '@/state';
import { Artefact } from '@/models/artefact';
import { Polygon } from '@/utils/Polygons';
import { InterpretationRoi, SignInterpretation, Sign, TextFragment } from '@/models/text';
import {
    ArtefactRotateOperation,
    ArtefactEditLineOperation,
    ArtefactAddLineOperation,
    ArtefactDeleteLineOperation,
    ArtefactROIOperation,
    TextFragmentAttributeOperation,
    SignInterpretationCommentOperation,
    UpdateSignInterperationOperation,
    DeleteSignInterpretationOperation,
    CreateSignInterpretationOperation,
} from '@/views/artefact-editor/operations';
import type {
    ArtefactDTO,
    LineDTO,
    InterpretationAttributeDTO,
    SignInterpretationDTO,
    TextFragmentDTO,
} from '@/dtos/sqe-dtos';

const st = StateManager.instance;

function makeArtefactDto(over: Partial<ArtefactDTO> = {}): ArtefactDTO {
    return {
        id: 1,
        name: 'frg 1',
        editionId: 100,
        imagedObjectId: 'IO-1',
        imageId: 1,
        artefactDataEditorId: 1,
        mask: 'POLYGON((0 0,10 0,10 10,0 10,0 0))',
        artefactMaskEditorId: 1,
        isPlaced: true,
        placement: { scale: 1, rotate: 0, translate: { x: 100, y: 200 }, zIndex: 0, mirrored: false },
        artefactPlacementEditorId: 1,
        side: 'recto',
        statusMessage: '',
        ...over,
    } as ArtefactDTO;
}

function seedCurrentArtefact(id = 1): Artefact {
    const art = new Artefact(makeArtefactDto({ id }));
    st.artefacts.items = [art];
    st.artefacts.current = art;
    return art;
}

function makeSiDto(over: Partial<SignInterpretationDTO> = {}): SignInterpretationDTO {
    return {
        signInterpretationId: 1000,
        signId: 1,
        character: 'א',
        isVariant: false,
        commentary: undefined,
        attributes: [],
        rois: [],
        nextSignInterpretations: [],
        signStreamSectionIds: [],
        ...over,
    } as unknown as SignInterpretationDTO;
}

// Build a standalone SignInterpretation with a real Sign/Line backing structure so
// sign-edit operations that walk sign.line/indexInLine work.
function buildSignInterpretation(dto: SignInterpretationDTO): SignInterpretation {
    const line: any = { signs: [], lineId: 1, editorId: 1 };
    const sign = new Sign({ signInterpretations: [dto] } as any, line, 0);
    line.signs.push(sign);
    return sign.signInterpretations[0];
}

function resetStore() {
    st.artefacts.items = [];
    st.signInterpretations.clear();
    st.interpretationRois.clear();
    st.editions.items = [];
}

describe('ArtefactRotateOperation', () => {
    beforeEach(resetStore);

    it('redo emits the next angle, undo emits the prev angle', () => {
        seedCurrentArtefact();
        const angles: number[] = [];
        st.eventBus.on('change-artefact-rotation', (a: number) => angles.push(a));

        const op = new ArtefactRotateOperation(10, 90);
        op.redo(true);
        op.undo();
        expect(angles).toEqual([90, 10]);
    });

    it('uniteWith merges rotate ops keeping prev of older and next of newer', () => {
        seedCurrentArtefact();
        const older = new ArtefactRotateOperation(0, 45);
        const newer = new ArtefactRotateOperation(45, 90);
        const united = newer.uniteWith(older) as ArtefactRotateOperation;
        expect(united.prev).toBe(0);
        expect(united.next).toBe(90);
    });

    it('uniteWith returns undefined for a different op type', () => {
        seedCurrentArtefact();
        const rotate = new ArtefactRotateOperation(0, 45);
        const comment = new SignInterpretationCommentOperationHelper();
        expect(rotate.uniteWith(comment as any)).toBeUndefined();
    });

    it('getId returns the current artefact id; replaceEntityId mutates it', () => {
        const art = seedCurrentArtefact(7);
        const op = new ArtefactRotateOperation(0, 1);
        expect(op.getId()).toBe(7);
        op.replaceEntityId(99);
        expect(art.id).toBe(99);
    });

    it('throws when there is no current artefact', () => {
        st.artefacts.items = [];
        st.artefacts.current = null;
        const op = new ArtefactRotateOperation(0, 1);
        expect(() => op.getId()).toThrow(/no current artefact/);
    });
});

// tiny helper to get a non-rotate op cheaply for negative uniteWith test
class SignInterpretationCommentOperationHelper {
    public type = 'commentary';
}

describe('ArtefactEditLineOperation', () => {
    beforeEach(() => {
        resetStore();
        replaceText.mockClear();
    });

    it('redo calls replaceText with next, undo with prev', () => {
        seedCurrentArtefact();
        const op = new ArtefactEditLineOperation(100, 5, 9, 'NEW', 'OLD');
        op.redo(true);
        expect(replaceText).toHaveBeenCalledWith(100, 5, 9, 'NEW');
        op.undo();
        expect(replaceText).toHaveBeenCalledWith(100, 5, 9, 'OLD');
    });

    it('uniteWith merges editLine ops (own next + older prev)', () => {
        seedCurrentArtefact();
        const older = new ArtefactEditLineOperation(100, 5, 9, 'B', 'A');
        const newer = new ArtefactEditLineOperation(100, 5, 9, 'C', 'B');
        const united = newer.uniteWith(older) as ArtefactEditLineOperation;
        expect(united.next).toBe('C');
        expect(united.prev).toBe('A');
    });
});

describe('ArtefactAddLineOperation / ArtefactDeleteLineOperation', () => {
    const line = { editorId: 55, lineId: 77 } as LineDTO;

    beforeEach(() => {
        resetStore();
        createLine.mockClear();
        deleteLine.mockClear();
    });

    it('add: redo creates the line, undo deletes it', () => {
        seedCurrentArtefact();
        const op = new ArtefactAddLineOperation(100, line, 3, 10, 20);
        op.redo(true);
        expect(createLine).toHaveBeenCalledWith(100, 3, line, 10, 20);
        op.undo();
        expect(deleteLine).toHaveBeenCalledWith(55, 77);
    });

    it('add: uniteWith merges into a new add op', () => {
        seedCurrentArtefact();
        const a = new ArtefactAddLineOperation(100, line, 3, 10, 20);
        const b = new ArtefactAddLineOperation(100, line, 3, 10, 20);
        expect(a.uniteWith(b)).toBeInstanceOf(ArtefactAddLineOperation);
    });

    it('delete: redo deletes the line, undo recreates it', () => {
        seedCurrentArtefact();
        const op = new ArtefactDeleteLineOperation(100, line, 3, 10, 20);
        op.redo(true);
        expect(deleteLine).toHaveBeenCalledWith(55, 77);
        op.undo();
        expect(createLine).toHaveBeenCalledWith(100, 3, line, 10, 20);
    });

    it('delete: uniteWith merges into a new delete op', () => {
        seedCurrentArtefact();
        const a = new ArtefactDeleteLineOperation(100, line, 3, 10, 20);
        const b = new ArtefactDeleteLineOperation(100, line, 3, 10, 20);
        expect(a.uniteWith(b)).toBeInstanceOf(ArtefactDeleteLineOperation);
    });

    it('delete/add/editLine uniteWith return undefined for a foreign op type', () => {
        seedCurrentArtefact();
        const foreign = { type: 'rotate' } as any;
        expect(new ArtefactDeleteLineOperation(100, line, 3, 10, 20).uniteWith(foreign)).toBeUndefined();
        expect(new ArtefactAddLineOperation(100, line, 3, 10, 20).uniteWith(foreign)).toBeUndefined();
        expect(new ArtefactEditLineOperation(100, 5, 9, 'N', 'O').uniteWith(foreign)).toBeUndefined();
    });
});

describe('ArtefactROIOperation', () => {
    beforeEach(resetStore);

    function makeRoi(art: Artefact, si: SignInterpretation): InterpretationRoi {
        return InterpretationRoi.new(art, si, Polygon.fromWkt('POLYGON((0 0,1 0,1 1,0 1,0 0))'), { x: 0, y: 0 });
    }

    it("draw: redo places the ROI in state and attaches it to its SI; undo marks it deleted", () => {
        const art = seedCurrentArtefact();
        const si = buildSignInterpretation(makeSiDto({ signInterpretationId: 2000 }));
        st.signInterpretations.put(si);

        const roi = makeRoi(art, si);
        const op = new ArtefactROIOperation('draw', roi);

        op.redo(true);
        const stored = st.interpretationRois.get(op.roi.id);
        expect(stored).toBeTruthy();
        expect(op.roi.status).toBe('new');
        expect(si.rois.some(r => r.id === op.roi.id)).toBe(true);

        op.undo();
        expect(stored!.status).toBe('deleted');
        expect(si.rois.some(r => r.id === op.roi.id)).toBe(false);
    });

    it("erase: redo removes an existing ROI, undo places it back", () => {
        const art = seedCurrentArtefact();
        const si = buildSignInterpretation(makeSiDto({ signInterpretationId: 2001 }));
        st.signInterpretations.put(si);

        const roi = makeRoi(art, si);
        // Put the ROI into state so 'erase' can find + delete it.
        st.interpretationRois.put(roi);
        roi.status = 'new';
        si.rois.push(roi);

        const op = new ArtefactROIOperation('erase', roi);
        op.redo(true);
        expect(st.interpretationRois.get(roi.id)!.status).toBe('deleted');

        op.undo();
        expect(st.interpretationRois.get(op.roi.id)).toBeTruthy();
        expect(op.roi.status).toBe('new');
    });

    it("erase: resolves the ROI via the frontend->server id map when the frontend id isn't in state", () => {
        const art = seedCurrentArtefact();
        const si = buildSignInterpretation(makeSiDto({ signInterpretationId: 2004 }));
        st.signInterpretations.put(si);

        const roi = makeRoi(art, si);
        const op = new ArtefactROIOperation('erase', roi);

        // The op holds a clone with the frontend id, but state only holds the ROI
        // under a *server* id. removeRoi must follow the id map to find it.
        const serverId = op.roi.id + 100000;
        const serverRoi = roi.clone();
        serverRoi.interpretationRoiId = serverId; // id getter = interpretationRoiId || internalId
        st.interpretationRois.put(serverRoi);
        serverRoi.status = 'new';
        st.interpretationRois.mapFrontendIdToServerId(op.roi.id, serverId);

        op.redo(true);
        expect(st.interpretationRois.get(serverId)!.status).toBe('deleted');
    });

    it("erase: does nothing (logs) when the ROI can't be found anywhere in state", () => {
        const art = seedCurrentArtefact();
        const si = buildSignInterpretation(makeSiDto({ signInterpretationId: 2005 }));
        st.signInterpretations.put(si);
        const roi = makeRoi(art, si);
        const op = new ArtefactROIOperation('erase', roi);
        // Nothing seeded into interpretationRois -> removeRoi bails out early.
        expect(() => op.redo(true)).not.toThrow();
    });

    it('constructor clones the incoming ROI (does not hold the original)', () => {
        const art = seedCurrentArtefact();
        const si = buildSignInterpretation(makeSiDto({ signInterpretationId: 2002 }));
        st.signInterpretations.put(si);
        const roi = makeRoi(art, si);
        const op = new ArtefactROIOperation('draw', roi);
        expect(op.roi).not.toBe(roi);
        expect(op.roi.artefactId).toBe(roi.artefactId);
    });

    it('uniteWith always returns undefined', () => {
        const art = seedCurrentArtefact();
        const si = buildSignInterpretation(makeSiDto({ signInterpretationId: 2003 }));
        st.signInterpretations.put(si);
        const roi = makeRoi(art, si);
        const a = new ArtefactROIOperation('draw', roi);
        const b = new ArtefactROIOperation('draw', roi);
        expect(a.uniteWith(b)).toBeUndefined();
    });
});

describe('TextFragmentAttributeOperation', () => {
    beforeEach(resetStore);

    const attr = (valueId: number): InterpretationAttributeDTO => ({
        attributeId: 33,
        attributeValueId: valueId,
        attributeString: 'foo',
        attributeValueString: 'bar',
        interpretationAttributeId: valueId,
        creatorId: 0,
        editorId: 0,
    } as InterpretationAttributeDTO);

    function seedSi(id: number, attributes: InterpretationAttributeDTO[]) {
        const si = buildSignInterpretation(makeSiDto({ signInterpretationId: id, attributes }));
        st.signInterpretations.put(si);
        return si;
    }

    it('create: redo adds a new attribute, undo removes it', () => {
        seedCurrentArtefact();
        const si = seedSi(3000, []);
        const op = new TextFragmentAttributeOperation(3000, 5, attr(5));
        expect(op.attributeOperationType).toBe('create');

        op.redo(true);
        expect(si.attributes.find(a => a.attributeValueId === 5)).toBeTruthy();
        op.undo();
        expect(si.attributes.find(a => a.attributeValueId === 5)).toBeFalsy();
    });

    it('delete: redo removes existing attribute, undo restores it', () => {
        seedCurrentArtefact();
        const si = seedSi(3001, [attr(5)]);
        const op = new TextFragmentAttributeOperation(3001, 5, undefined);
        expect(op.attributeOperationType).toBe('delete');

        op.redo(true);
        expect(si.attributes.find(a => a.attributeValueId === 5)).toBeFalsy();
        op.undo();
        expect(si.attributes.find(a => a.attributeValueId === 5)).toBeTruthy();
    });

    it('update: redo swaps in next attribute in place', () => {
        seedCurrentArtefact();
        const si = seedSi(3002, [attr(5)]);
        const next = attr(6);
        const op = new TextFragmentAttributeOperation(3002, 5, next);
        expect(op.attributeOperationType).toBe('update');

        op.redo(true);
        expect(si.attributes.find(a => a.attributeValueId === 6)).toBeTruthy();
        expect(si.attributes.find(a => a.attributeValueId === 5)).toBeFalsy();
        op.undo();
        expect(si.attributes.find(a => a.attributeValueId === 5)).toBeTruthy();
    });

    it('uniteWith merges two attr ops on the same SI + valueId', () => {
        seedCurrentArtefact();
        seedSi(3003, [attr(5)]);
        const older = new TextFragmentAttributeOperation(3003, 5, attr(6));
        const newer = new TextFragmentAttributeOperation(3003, 5, attr(7));
        const united = newer.uniteWith(older) as TextFragmentAttributeOperation;
        expect(united).toBeTruthy();
        expect(united.next!.attributeValueId).toBe(7);
    });

    it('uniteWith returns undefined for a different SI', () => {
        seedCurrentArtefact();
        seedSi(3004, [attr(5)]);
        seedSi(3005, [attr(5)]);
        const a = new TextFragmentAttributeOperation(3004, 5, attr(6));
        const b = new TextFragmentAttributeOperation(3005, 5, attr(6));
        expect(a.uniteWith(b)).toBeUndefined();
    });

    it('uniteWith returns undefined for a foreign op type', () => {
        seedCurrentArtefact();
        seedSi(3006, [attr(5)]);
        const a = new TextFragmentAttributeOperation(3006, 5, attr(6));
        expect(a.uniteWith({ type: 'rotate' } as any)).toBeUndefined();
    });

    it('create: undo warns and no-ops when the attribute is already gone', () => {
        seedCurrentArtefact();
        const si = seedSi(3007, []);
        const op = new TextFragmentAttributeOperation(3007, 5, attr(5)); // create (no prev)
        // Directly undo without redo: no prev and nothing at that index -> warn branch.
        op.undo();
        expect(si.attributes.length).toBe(0);
    });

    it('delete: redo warns and no-ops when the attribute is already gone', () => {
        seedCurrentArtefact();
        const si = seedSi(3008, [attr(5)]);
        const op = new TextFragmentAttributeOperation(3008, 5, undefined); // delete (has prev)
        // Remove it out-of-band so redo finds no existing index and hits the warn branch.
        si.attributes.splice(0, 1);
        op.redo(true);
        expect(si.attributes.length).toBe(0);
    });
});

describe('SignInterpretationCommentOperation', () => {
    beforeEach(resetStore);

    function seedSi(id: number, commentary: string | null) {
        const si = buildSignInterpretation(makeSiDto({ signInterpretationId: id }));
        si.commentary = commentary;
        st.signInterpretations.put(si);
        return si;
    }

    it('redo sets the next comment, undo restores prev', () => {
        seedCurrentArtefact();
        const si = seedSi(4000, 'old');
        const op = new SignInterpretationCommentOperation(4000, 'new');
        op.redo(true);
        expect(si.commentary).toBe('new');
        op.undo();
        expect(si.commentary).toBe('old');
    });

    it('uniteWith merges comment ops on the same SI', () => {
        seedCurrentArtefact();
        seedSi(4001, 'a');
        const older = new SignInterpretationCommentOperation(4001, 'b');
        const newer = new SignInterpretationCommentOperation(4001, 'c');
        const united = newer.uniteWith(older) as SignInterpretationCommentOperation;
        expect(united.nextComment).toBe('c');
        expect(united.prevComment).toBe('a');
    });

    it('uniteWith returns undefined for a different SI', () => {
        seedCurrentArtefact();
        seedSi(4002, 'a');
        seedSi(4003, 'a');
        const a = new SignInterpretationCommentOperation(4002, 'b');
        const b = new SignInterpretationCommentOperation(4003, 'b');
        expect(a.uniteWith(b)).toBeUndefined();
    });

    it('uniteWith returns undefined for a foreign op type', () => {
        seedCurrentArtefact();
        seedSi(4004, 'a');
        const a = new SignInterpretationCommentOperation(4004, 'b');
        expect(a.uniteWith({ type: 'rotate' } as any)).toBeUndefined();
    });
});

describe('UpdateSignInterperationOperation', () => {
    beforeEach(resetStore);

    function seedSi(id: number, character: string) {
        const si = buildSignInterpretation(makeSiDto({ signInterpretationId: id, character }));
        st.signInterpretations.put(si);
        return si;
    }

    it('redo applies next character/signType, undo restores prev', () => {
        seedCurrentArtefact();
        const si = seedSi(5000, 'א');
        const op = new UpdateSignInterperationOperation(5000, 'ב', 1, 'LETTER');
        op.redo(true);
        expect(si.character).toBe('ב');
        expect(si.signType).toEqual([1, 'LETTER']);
        op.undo();
        expect(si.character).toBe('א');
    });

    it('uniteWith merges updates on the same SI keeping the older prev', () => {
        seedCurrentArtefact();
        seedSi(5001, 'א');
        const older = new UpdateSignInterperationOperation(5001, 'ב', 1, 'LETTER');
        const newer = new UpdateSignInterperationOperation(5001, 'ג', 1, 'LETTER');
        const united = newer.uniteWith(older) as UpdateSignInterperationOperation;
        expect(united.next.character).toBe('ג');
        expect(united.prev.character).toBe(older.prev.character);
    });

    it('uniteWith returns undefined across different SIs', () => {
        seedCurrentArtefact();
        seedSi(5002, 'א');
        seedSi(5003, 'א');
        const a = new UpdateSignInterperationOperation(5002, 'ב', 1, 'LETTER');
        const b = new UpdateSignInterperationOperation(5003, 'ב', 1, 'LETTER');
        expect(a.uniteWith(b)).toBeUndefined();
    });

    it('getId returns the current artefact id (inherited)', () => {
        const art = seedCurrentArtefact(11);
        seedSi(5004, 'א');
        const op = new UpdateSignInterperationOperation(5004, 'ב', 1, 'LETTER');
        expect(op.getId()).toBe(11);
    });

    it("prev character falls back to '' when the SI has no character", () => {
        seedCurrentArtefact();
        const si = seedSi(5005, 'א');
        si.character = ''; // getPrevSignData uses `si.character || ''`
        const op = new UpdateSignInterperationOperation(5005, 'ב', 1, 'LETTER');
        expect(op.prev.character).toBe('');
    });
});

// Create/Delete sign operations manipulate a line's sign linked-list. We build a
// two-sign line so there is a "previous sign" for the linked-list bookkeeping.
describe('Create/Delete SignInterpretationOperation', () => {
    beforeEach(resetStore);

    function seedLineWithTwoSigns(firstId: number, secondId: number) {
        const tfDto = {
            textFragmentId: 1,
            textFragmentName: 'tf',
            editorId: 1,
            lines: [
                {
                    lineId: 1,
                    lineName: 'l1',
                    editorId: 1,
                    signs: [
                        { signInterpretations: [makeSiDto({ signInterpretationId: firstId, nextSignInterpretations: [{ nextSignInterpretationId: secondId, creatorId: 0, editorId: 0 }] })] },
                        { signInterpretations: [makeSiDto({ signInterpretationId: secondId, nextSignInterpretations: [{ nextSignInterpretationId: 9999, creatorId: 0, editorId: 0 }] })] },
                    ],
                } as LineDTO,
            ],
        } as TextFragmentDTO;
        // Build via TextFragment so Sign/Line/SI wiring matches production.
        const tf = new TextFragment(tfDto);
        const line = tf.lines[0];
        for (const sign of line.signs) {
            st.signInterpretations.put(sign.signInterpretations[0]);
        }
        return { tf, line };
    }

    it('delete: redo removes the sign from its line, undo adds it back', () => {
        seedCurrentArtefact();
        const { line } = seedLineWithTwoSigns(6000, 6001);
        const before = line.signs.length;

        const op = new DeleteSignInterpretationOperation(6001);
        op.redo(true);
        expect(line.signs.length).toBe(before - 1);
        op.undo();
        expect(line.signs.length).toBe(before);
    });

    it('create: redo adds a new sign into the line, undo removes it', () => {
        seedCurrentArtefact();
        const { line } = seedLineWithTwoSigns(6100, 6101);
        const before = line.signs.length;

        const op = new CreateSignInterpretationOperation(6100, 'ד', 1, 'LETTER');
        // The new sign interpretation should already be registered in state.
        expect(op.signInterpretation.character).toBe('ד');

        op.redo(true);
        expect(line.signs.length).toBe(before + 1);
        op.undo();
        expect(line.signs.length).toBe(before);
    });

    it('create/delete never unite (return undefined)', () => {
        seedCurrentArtefact();
        seedLineWithTwoSigns(6200, 6201);
        const del = new DeleteSignInterpretationOperation(6201);
        const create = new CreateSignInterpretationOperation(6200, 'ה', 1, 'LETTER');
        expect(del.uniteWith(create)).toBeUndefined();
        expect(create.uniteWith(del)).toBeUndefined();
    });

    it('sign-edit uniteWith returns undefined for a foreign (non-sign) op type', () => {
        seedCurrentArtefact();
        seedLineWithTwoSigns(6300, 6301);
        const del = new DeleteSignInterpretationOperation(6301);
        expect(del.uniteWith({ type: 'rotate' } as any)).toBeUndefined();
    });

    it('delete constructor marks state corrupt when the SI is missing', () => {
        seedCurrentArtefact();
        expect(() => new DeleteSignInterpretationOperation(999999)).toThrow(/corrupt/i);
    });

    it('create constructor marks state corrupt when the anchor SI is missing', () => {
        seedCurrentArtefact();
        expect(() => new CreateSignInterpretationOperation(999999, 'x', 1, 'LETTER')).toThrow(/corrupt/i);
    });
});
