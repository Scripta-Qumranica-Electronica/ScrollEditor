import { describe, it, expect, beforeEach } from 'vitest';
import { StateManager } from '@/state';
import { Artefact } from '@/models/artefact';
import { ArtefactGroup, EditionInfo } from '@/models/edition';
import { Placement } from '@/utils/Placement';
import {
    ArtefactPlacementOperation,
    GroupPlacementOperation,
    EditGroupOperation,
    EditionMetricOperation,
} from '@/views/scroll-editor/operations';
import type { ArtefactDTO, EditionDTO, UpdateEditionManuscriptMetricsDTO } from '@/dtos/sqe-dtos';

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

function makeEdition(): EditionInfo {
    const dto = {
        id: 100,
        name: 'ed',
        permission: { mayWrite: true, mayLock: true, isAdmin: true, mayRead: true },
        owner: { userId: 1, email: 'a@b.c', forename: 'A', surname: 'B', organization: '' },
        copyright: '',
        manuscriptId: 1,
        isPublic: false,
        locked: false,
        metrics: { width: 1000, height: 500, ppi: 1215, xOrigin: 0, yOrigin: 0 },
        shares: [],
        lastEdit: undefined,
    } as unknown as EditionDTO;
    return new EditionInfo(dto);
}

function placement(rotate: number, x: number): Placement {
    return new Placement({ scale: 1, rotate, translate: { x, y: 0 }, zIndex: 0, mirrored: false });
}

describe('ArtefactPlacementOperation', () => {
    beforeEach(() => {
        st.artefacts.items = [];
    });

    it('redo() applies next placement/isPlaced; undo() restores prev', () => {
        st.artefacts.add(new Artefact(makeArtefactDto({ id: 1 })));
        const prev = placement(0, 100);
        const next = placement(90, 500);
        const op = new ArtefactPlacementOperation(1, 'translate', prev, next, true, true);

        op.redo(true);
        const art = st.artefacts.find(1)!;
        expect(art.placement.translate.x).toBe(500);
        expect(art.placement.rotate).toBe(90);
        expect(art.isPlaced).toBe(true);

        op.undo();
        expect(art.placement.translate.x).toBe(100);
        expect(art.placement.rotate).toBe(0);
    });

    it('undo() to unplaced sets isPlaced=false', () => {
        st.artefacts.add(new Artefact(makeArtefactDto({ id: 2 })));
        const op = new ArtefactPlacementOperation(2, 'add', placement(0, 0), placement(0, 300), false, true);
        op.redo(true);
        expect(st.artefacts.find(2)!.isPlaced).toBe(true);
        op.undo();
        expect(st.artefacts.find(2)!.isPlaced).toBe(false);
    });

    it('constructor clones prev/next placements', () => {
        st.artefacts.add(new Artefact(makeArtefactDto({ id: 1 })));
        const prev = placement(0, 100);
        const next = placement(0, 200);
        const op = new ArtefactPlacementOperation(1, 'translate', prev, next, true, true);
        expect(op.prev).not.toBe(prev);
        expect(op.next).not.toBe(next);
        expect(op.prev.translate.x).toBe(100);
    });

    it('uniteWith merges two translate ops on the same artefact, keeping earliest prev + latest next', () => {
        st.artefacts.add(new Artefact(makeArtefactDto({ id: 1 })));
        const first = new ArtefactPlacementOperation(1, 'translate', placement(0, 100), placement(0, 200), true, true);
        const second = new ArtefactPlacementOperation(1, 'translate', placement(0, 200), placement(0, 350), true, true);
        const united = second.uniteWith(first)!;
        expect(united).toBeDefined();
        expect(united.prev.translate.x).toBe(100); // first.prev
        expect(united.next.translate.x).toBe(350); // second.next
    });

    it('uniteWith returns undefined for different artefact ids', () => {
        st.artefacts.add(new Artefact(makeArtefactDto({ id: 1 })));
        const a = new ArtefactPlacementOperation(1, 'translate', placement(0, 0), placement(0, 1), true, true);
        const b = new ArtefactPlacementOperation(2, 'translate', placement(0, 0), placement(0, 1), true, true);
        expect(a.uniteWith(b)).toBeUndefined();
    });

    it('uniteWith returns undefined for non-mergeable types (add/delete)', () => {
        st.artefacts.add(new Artefact(makeArtefactDto({ id: 1 })));
        const a = new ArtefactPlacementOperation(1, 'add', placement(0, 0), placement(0, 1), true, true);
        const b = new ArtefactPlacementOperation(1, 'add', placement(0, 0), placement(0, 1), true, true);
        expect(a.uniteWith(b)).toBeUndefined();
    });

    it('uniteWith returns undefined for a non-ArtefactPlacementOperation', () => {
        st.artefacts.add(new Artefact(makeArtefactDto({ id: 1 })));
        const a = new ArtefactPlacementOperation(1, 'translate', placement(0, 0), placement(0, 1), true, true);
        const other = new EditGroupOperation(5, [], []);
        expect(a.uniteWith(other)).toBeUndefined();
    });

    it('getId/replaceEntityId round trip the artefact id', () => {
        st.artefacts.add(new Artefact(makeArtefactDto({ id: 3 })));
        const op = new ArtefactPlacementOperation(3, 'translate', placement(0, 0), placement(0, 1), true, true);
        expect(op.getId()).toBe(3);
        op.replaceEntityId(88);
        expect(op.getId()).toBe(88);
    });

    it('throws when the artefact is missing from state', () => {
        const op = new ArtefactPlacementOperation(404, 'translate', placement(0, 0), placement(0, 1), true, true);
        expect(() => op.redo(true)).toThrow(/Couldn't find artefact/);
    });

    it('redo() to unplaced emits select-artefact undefined and sets isPlaced=false', () => {
        st.artefacts.add(new Artefact(makeArtefactDto({ id: 9 })));
        const events: any[] = [];
        st.eventBus.on('select-artefact', a => events.push(a));
        const op = new ArtefactPlacementOperation(9, 'delete', placement(0, 100), placement(0, 0), true, false);
        op.redo(true);
        expect(st.artefacts.find(9)!.isPlaced).toBe(false);
        expect(events[events.length - 1]).toBeUndefined();
    });

    it('undo() to unplaced emits select-artefact undefined', () => {
        st.artefacts.add(new Artefact(makeArtefactDto({ id: 8 })));
        const events: any[] = [];
        const op = new ArtefactPlacementOperation(8, 'add', placement(0, 0), placement(0, 300), false, true);
        op.redo(true);
        st.eventBus.on('select-artefact', a => events.push(a));
        op.undo();
        expect(events[events.length - 1]).toBeUndefined();
    });
});

describe('EditGroupOperation', () => {
    beforeEach(() => {
        st.artefacts.items = [];
        st.editions.items = [];
    });

    it('redo() sets next artefactIds, undo() restores prev', () => {
        const edition = makeEdition();
        const group = ArtefactGroup.generateGroup([1, 2]);
        edition.artefactGroups = [group];
        st.editions.items = [edition];
        st.editions.current = edition;

        const op = new EditGroupOperation(group.groupId, [1, 2], [1, 2, 3]);
        op.redo(true);
        expect(group.artefactIds).toEqual([1, 2, 3]);
        op.undo();
        expect(group.artefactIds).toEqual([1, 2]);
    });

    it('uniteWith / getId / replaceEntityId', () => {
        const op = new EditGroupOperation(5, [1], [1, 2]);
        expect(op.uniteWith(op)).toBeUndefined();
        expect(op.getId()).toBe(5);
        op.replaceEntityId(9);
        expect(op.getId()).toBe(9);
    });
});

describe('EditionMetricOperation', () => {
    beforeEach(() => {
        st.editions.items = [];
    });

    it('redo() merges next metrics, undo() merges prev metrics', () => {
        const edition = makeEdition();
        st.editions.items = [edition];
        st.editions.current = edition;

        const prev = { width: 1000, height: 500 } as UpdateEditionManuscriptMetricsDTO;
        const next = { width: 2000, height: 800 } as UpdateEditionManuscriptMetricsDTO;
        const op = new EditionMetricOperation(100, prev, next);

        op.redo(true);
        expect(edition.metrics.width).toBe(2000);
        expect(edition.metrics.height).toBe(800);
        expect(edition.metrics.ppi).toBe(1215); // untouched key preserved by merge

        op.undo();
        expect(edition.metrics.width).toBe(1000);
        expect(edition.metrics.height).toBe(500);
    });

    it('uniteWith always undefined; each op has a unique auto-incremented id', () => {
        const op1 = new EditionMetricOperation(100, {} as any, {} as any);
        const op2 = new EditionMetricOperation(100, {} as any, {} as any);
        expect(op1.uniteWith(op2)).toBeUndefined();
        expect(op1.getId()).not.toBe(op2.getId());
    });

    it('replaceEntityId is a no-op (internal ids never change)', () => {
        const op = new EditionMetricOperation(100, {} as any, {} as any);
        const id = op.getId();
        op.replaceEntityId(9999);
        expect(op.getId()).toBe(id);
    });
});

describe('GroupPlacementOperation', () => {
    beforeEach(() => {
        st.artefacts.items = [];
        st.editions.items = [];
    });

    function seedEdition(group?: ArtefactGroup): EditionInfo {
        const edition = makeEdition();
        edition.artefactGroups = group ? [group] : [];
        st.editions.items = [edition];
        st.editions.current = edition;
        return edition;
    }

    it('getId/replaceEntityId round trip the group id', () => {
        seedEdition();
        const op = new GroupPlacementOperation(10, []);
        expect(op.getId()).toBe(10);
        op.replaceEntityId(20);
        expect(op.getId()).toBe(20);
    });

    it('undo() delegates to child operations (restores their prev placement)', () => {
        seedEdition();
        st.artefacts.add(new Artefact(makeArtefactDto({ id: 1 })));
        const child = new ArtefactPlacementOperation(1, 'translate', placement(0, 100), placement(0, 400), true, true);
        // Apply the child's placement first (as the real flow does at creation), then
        // wrap it in a group and undo the group -> restores prev.
        child.redo(true);
        expect(st.artefacts.find(1)!.placement.translate.x).toBe(400);
        const group = new GroupPlacementOperation(10, [child], 'placement');

        group.undo();
        expect(st.artefacts.find(1)!.placement.translate.x).toBe(100);
    });

    it('redo() after an undo re-applies child next placement', () => {
        seedEdition();
        st.artefacts.add(new Artefact(makeArtefactDto({ id: 1 })));
        const child = new ArtefactPlacementOperation(1, 'translate', placement(0, 100), placement(0, 400), true, true);
        child.redo(true);
        const group = new GroupPlacementOperation(10, [child], 'placement');
        group.undo();
        expect(st.artefacts.find(1)!.placement.translate.x).toBe(100);
        group.redo();
        expect(st.artefacts.find(1)!.placement.translate.x).toBe(400);
    });

    it('placement redo flips type to delete', () => {
        seedEdition();
        st.artefacts.add(new Artefact(makeArtefactDto({ id: 1 })));
        st.artefacts.add(new Artefact(makeArtefactDto({ id: 2 })));
        const c1 = new ArtefactPlacementOperation(1, 'translate', placement(0, 0), placement(0, 1), true, true);
        const c2 = new ArtefactPlacementOperation(2, 'translate', placement(0, 0), placement(0, 1), true, true);
        const group = new GroupPlacementOperation(10, [c1, c2], 'placement');
        group.redo(true);
        expect(group.type).toBe('delete');
    });

    it("uniteWith merges when both ops target the same artefact set", () => {
        seedEdition();
        st.artefacts.add(new Artefact(makeArtefactDto({ id: 1 })));
        st.artefacts.add(new Artefact(makeArtefactDto({ id: 2 })));

        const prevGroup = new GroupPlacementOperation(10, [
            new ArtefactPlacementOperation(1, 'translate', placement(0, 0), placement(0, 10), true, true),
            new ArtefactPlacementOperation(2, 'translate', placement(0, 0), placement(0, 20), true, true),
        ], 'placement');
        const nextGroup = new GroupPlacementOperation(10, [
            new ArtefactPlacementOperation(1, 'translate', placement(0, 10), placement(0, 30), true, true),
            new ArtefactPlacementOperation(2, 'translate', placement(0, 20), placement(0, 40), true, true),
        ], 'placement');

        const united = nextGroup.uniteWith(prevGroup);
        expect(united).toBeInstanceOf(GroupPlacementOperation);
    });

    it('uniteWith returns undefined when the artefact sets differ', () => {
        seedEdition();
        st.artefacts.add(new Artefact(makeArtefactDto({ id: 1 })));
        st.artefacts.add(new Artefact(makeArtefactDto({ id: 2 })));
        const a = new GroupPlacementOperation(10, [
            new ArtefactPlacementOperation(1, 'translate', placement(0, 0), placement(0, 1), true, true),
        ], 'placement');
        const b = new GroupPlacementOperation(10, [
            new ArtefactPlacementOperation(2, 'translate', placement(0, 0), placement(0, 1), true, true),
        ], 'placement');
        expect(a.uniteWith(b)).toBeUndefined();
    });

    it('uniteWith returns undefined for a non-GroupPlacementOperation', () => {
        seedEdition();
        const a = new GroupPlacementOperation(10, [], 'placement');
        expect(a.uniteWith(new EditGroupOperation(1, [], []))).toBeUndefined();
    });

    it("uniteWith returns undefined when type is not 'placement'", () => {
        seedEdition();
        const a = new GroupPlacementOperation(10, [], 'edit');
        const b = new GroupPlacementOperation(10, [], 'edit');
        expect(a.uniteWith(b)).toBeUndefined();
    });

    it('redo flips to delete, undo recreates the group and re-issues a new group id', () => {
        const edition = seedEdition();
        st.artefacts.add(new Artefact(makeArtefactDto({ id: 1 })));
        st.artefacts.add(new Artefact(makeArtefactDto({ id: 2 })));
        const c1 = new ArtefactPlacementOperation(1, 'translate', placement(0, 0), placement(0, 10), true, true);
        const c2 = new ArtefactPlacementOperation(2, 'translate', placement(0, 0), placement(0, 20), true, true);
        const group = new GroupPlacementOperation(10, [c1, c2], 'placement');

        group.redo(true);
        expect(group.type).toBe('delete');

        // Undo the delete: the group must be recreated and pushed back into the edition.
        const before = edition.artefactGroups.length;
        group.undo();
        expect(group.type).toBe('placement');
        expect(edition.artefactGroups.length).toBe(before + 1);
    });

    it('redo of a group already typed delete keeps it in the delete branch', () => {
        seedEdition();
        st.artefacts.add(new Artefact(makeArtefactDto({ id: 1 })));
        st.artefacts.add(new Artefact(makeArtefactDto({ id: 2 })));
        const c1 = new ArtefactPlacementOperation(1, 'translate', placement(0, 0), placement(0, 10), true, true);
        const c2 = new ArtefactPlacementOperation(2, 'translate', placement(0, 0), placement(0, 20), true, true);
        const group = new GroupPlacementOperation(10, [c1, c2], 'delete');
        group.redo(true);
        expect(group.type).toBe('delete');
    });

    it('uniteWith returns undefined when the child ops cannot themselves unite', () => {
        seedEdition();
        st.artefacts.add(new Artefact(makeArtefactDto({ id: 1 })));
        // 'add' children never unite, so the group unite must bail out.
        const prevGroup = new GroupPlacementOperation(10, [
            new ArtefactPlacementOperation(1, 'add', placement(0, 0), placement(0, 10), true, true),
        ], 'placement');
        const nextGroup = new GroupPlacementOperation(10, [
            new ArtefactPlacementOperation(1, 'add', placement(0, 10), placement(0, 30), true, true),
        ], 'placement');
        expect(nextGroup.uniteWith(prevGroup)).toBeUndefined();
    });

    it('uniteWith sorts children by id before comparing (descending input still merges)', () => {
        seedEdition();
        st.artefacts.add(new Artefact(makeArtefactDto({ id: 1 })));
        st.artefacts.add(new Artefact(makeArtefactDto({ id: 2 })));
        // Children supplied in descending id order so the sort comparator returns 1.
        const prevGroup = new GroupPlacementOperation(10, [
            new ArtefactPlacementOperation(2, 'translate', placement(0, 0), placement(0, 20), true, true),
            new ArtefactPlacementOperation(1, 'translate', placement(0, 0), placement(0, 10), true, true),
        ], 'placement');
        const nextGroup = new GroupPlacementOperation(10, [
            new ArtefactPlacementOperation(2, 'translate', placement(0, 20), placement(0, 40), true, true),
            new ArtefactPlacementOperation(1, 'translate', placement(0, 10), placement(0, 30), true, true),
        ], 'placement');
        expect(nextGroup.uniteWith(prevGroup)).toBeInstanceOf(GroupPlacementOperation);
    });

    it('redo of a single-artefact group emits select-group for that artefact', () => {
        seedEdition();
        st.artefacts.add(new Artefact(makeArtefactDto({ id: 1 })));
        const child = new ArtefactPlacementOperation(1, 'translate', placement(0, 0), placement(0, 10), true, true);
        const group = new GroupPlacementOperation(10, [child], 'placement');
        const grps: any[] = [];
        st.eventBus.on('select-group', g => grps.push(g));
        group.redo(true);
        expect(grps.length).toBeGreaterThan(0);
    });
});

describe('EditGroupOperation / EditionMetricOperation error paths', () => {
    beforeEach(() => {
        st.artefacts.items = [];
        st.editions.items = [];
    });

    it('EditGroupOperation.internalRedo throws when the group is missing from the edition', () => {
        const edition = makeEdition();
        edition.artefactGroups = [];
        st.editions.items = [edition];
        st.editions.current = edition;
        const op = new EditGroupOperation(4040, [1], [1, 2]);
        expect(() => op.redo(true)).toThrow(/Couldn't find group/);
    });

    it('EditionMetricOperation.internalRedo throws when there is no current edition', () => {
        st.editions.items = [];
        st.editions.current = null;
        const op = new EditionMetricOperation(100, {} as any, {} as any);
        expect(() => op.redo(true)).toThrow(/Couldn't find editon/);
    });
});
