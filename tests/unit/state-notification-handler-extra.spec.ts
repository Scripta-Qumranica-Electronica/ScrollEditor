import { describe, it, expect, beforeEach } from 'vitest';
import { StateManager } from '@/state';
import { Artefact } from '@/models/artefact';
import { EditionInfo, ArtefactGroup } from '@/models/edition';
import { ImagedObject } from '@/models/imaged-object';
import {
    NotificationHandler,
    applyArtefactDto,
    registerPendingOperation,
} from '@/state/notification-handler';
import type {
    ArtefactDTO,
    EditionDTO,
    ArtefactGroupDTO,
    DeleteIntIdDTO,
    ImagedObjectDTO,
    DetailedEditorRightsDTO,
    InterpretationRoiDTO,
    InterpretationRoiDTOList,
    UpdatedInterpretationRoiDTO,
    BatchEditRoiResponseDTO,
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

function makeEditionDto(over: Partial<EditionDTO> = {}): EditionDTO {
    return {
        id: 1,
        name: 'ed 1',
        manuscriptId: 1,
        editionDataEditorId: 1,
        permission: { mayRead: true, mayWrite: true, isAdmin: true },
        owner: { userId: 1, email: 'a@b.c' },
        shares: [],
        metrics: { width: 100, height: 100, xOrigin: 0, yOrigin: 0, ppi: 300, editorId: 1 },
        locked: false,
        isPublic: false,
        copyright: 'cc',
        lastEdit: '2020-01-01T00:00:00',
        ...over,
    } as EditionDTO;
}

function makeGroupDto(id: number, artefacts: number[] = [1, 2], name = 'g'): ArtefactGroupDTO {
    return { id, name, artefacts } as ArtefactGroupDTO;
}

function makeImagedObjectDto(id: string): ImagedObjectDTO {
    return { id, recto: { images: [] }, verso: { images: [] }, artefacts: [] } as unknown as ImagedObjectDTO;
}

function makeRoiDto(id: number, artefactId = 1, siId?: number): InterpretationRoiDTO {
    return {
        interpretationRoiId: id,
        artefactId,
        signInterpretationId: siId,
        shape: 'POLYGON((0 0,1 0,1 1,0 1,0 0))',
        translate: { x: 0, y: 0 },
        stanceRotation: 0,
        exceptional: false,
        valuesSet: true,
        creatorId: 1,
        editorId: 1,
    } as unknown as InterpretationRoiDTO;
}

const handler = new NotificationHandler();

beforeEach(() => {
    st.artefacts.items = [];
    st.editions.items = [];
    st.imagedObjects.items = [];
    st.operationsManager = null;
    st.interpretationRois.clear();
    st.signInterpretations.clear();
});

describe('handleUpdatedEdition', () => {
    it('copies fields onto the existing edition and keeps identity', () => {
        st.editions.add(new EditionInfo(makeEditionDto({ id: 3, name: 'old' })));
        const before = st.editions.find(3)!;
        handler.handleUpdatedEdition(makeEditionDto({ id: 3, name: 'renamed', locked: true }));
        const after = st.editions.find(3)!;
        expect(after.id).toBe(3);
        expect(after.name).toBe('renamed');
        expect(after.locked).toBe(true);
        // copyFrom mutates in place -> same id present, update() called
        expect(before.name).toBe('renamed');
    });

    it('ignores an edition we do not hold', () => {
        handler.handleUpdatedEdition(makeEditionDto({ id: 404 }));
        expect(st.editions.find(404)).toBeNull();
    });
});

describe('artefact groups — create / update / delete', () => {
    it('handleCreatedArtefactGroup pushes a new group into the current edition', () => {
        st.editions.add(new EditionInfo(makeEditionDto({ id: 1 })));
        st.editions.current = st.editions.find(1);
        handler.handleCreatedArtefactGroup(makeGroupDto(50, [1, 2], 'grp'));
        const g = st.editions.current!.artefactGroups.find(x => x.groupId === 50);
        expect(g).toBeTruthy();
        expect(g!.name).toBe('grp');
        expect(g!.artefactIds).toEqual([1, 2]);
    });

    it('handleCreatedArtefactGroup no-ops with no current edition', () => {
        st.editions.current = null;
        expect(() => handler.handleCreatedArtefactGroup(makeGroupDto(50))).not.toThrow();
    });

    it('handleUpdatedArtefactGroup mutates an existing group in place (identity preserved)', () => {
        st.editions.add(new EditionInfo(makeEditionDto({ id: 1 })));
        st.editions.current = st.editions.find(1);
        handler.handleCreatedArtefactGroup(makeGroupDto(60, [1], 'a'));
        const existing = st.editions.current!.artefactGroups.find(x => x.groupId === 60)!;
        handler.handleUpdatedArtefactGroup(makeGroupDto(60, [1, 2, 3], 'b'));
        const same = st.editions.current!.artefactGroups.find(x => x.groupId === 60)!;
        expect(same).toBe(existing); // in-place mutation, no replacement
        expect(same.name).toBe('b');
        expect(same.artefactIds).toEqual([1, 2, 3]);
    });

    it('handleUpdatedArtefactGroup diff-before-write skips an identical echo', () => {
        st.editions.add(new EditionInfo(makeEditionDto({ id: 1 })));
        st.editions.current = st.editions.find(1);
        handler.handleCreatedArtefactGroup(makeGroupDto(70, [1, 2], 'same'));
        const g = st.editions.current!.artefactGroups.find(x => x.groupId === 70)!;
        const idsRef = g.artefactIds;
        handler.handleUpdatedArtefactGroup(makeGroupDto(70, [1, 2], 'same'));
        // Unchanged -> artefactIds NOT reassigned (same array reference).
        expect(st.editions.current!.artefactGroups.find(x => x.groupId === 70)!.artefactIds).toBe(idsRef);
    });

    it('handleUpdatedArtefactGroup with a different-length id array does write', () => {
        st.editions.add(new EditionInfo(makeEditionDto({ id: 1 })));
        st.editions.current = st.editions.find(1);
        handler.handleCreatedArtefactGroup(makeGroupDto(71, [1, 2], 'n'));
        handler.handleUpdatedArtefactGroup(makeGroupDto(71, [1], 'n'));
        expect(st.editions.current!.artefactGroups.find(x => x.groupId === 71)!.artefactIds).toEqual([1]);
    });

    it('handleDeletedArtefactGroup splices matching groups out of the current edition', () => {
        st.editions.add(new EditionInfo(makeEditionDto({ id: 1 })));
        st.editions.current = st.editions.find(1);
        handler.handleCreatedArtefactGroup(makeGroupDto(80));
        handler.handleCreatedArtefactGroup(makeGroupDto(81));
        const del: DeleteIntIdDTO = { entity: 'artefactGroup', ids: [80] } as unknown as DeleteIntIdDTO;
        handler.handleDeletedArtefactGroup(del);
        expect(st.editions.current!.artefactGroups.find(x => x.groupId === 80)).toBeFalsy();
        expect(st.editions.current!.artefactGroups.find(x => x.groupId === 81)).toBeTruthy();
    });

    it('handleDeletedArtefactGroup no-ops with no current edition', () => {
        st.editions.current = null;
        const del: DeleteIntIdDTO = { entity: 'artefactGroup', ids: [1] } as unknown as DeleteIntIdDTO;
        expect(() => handler.handleDeletedArtefactGroup(del)).not.toThrow();
    });

    it('handleDeletedArtefactGroup tolerates deleting an id that is not present', () => {
        st.editions.add(new EditionInfo(makeEditionDto({ id: 1 })));
        st.editions.current = st.editions.find(1);
        handler.handleCreatedArtefactGroup(makeGroupDto(90));
        const del: DeleteIntIdDTO = { entity: 'artefactGroup', ids: [999] } as unknown as DeleteIntIdDTO;
        expect(() => handler.handleDeletedArtefactGroup(del)).not.toThrow();
        expect(st.editions.current!.artefactGroups.length).toBe(1);
    });
});

describe('handleCreatedArtefact', () => {
    it('adds a brand-new artefact', () => {
        handler.handleCreatedArtefact(makeArtefactDto({ id: 11, imagedObjectId: 'IO-X' }));
        expect(st.artefacts.find(11)).toBeTruthy();
    });

    it('routes an already-held artefact through the update path', () => {
        st.artefacts.add(new Artefact(makeArtefactDto({ id: 12 })));
        handler.handleCreatedArtefact(
            makeArtefactDto({ id: 12, name: 'updated-name' }),
        );
        expect(st.artefacts.find(12)!.name).toBe('updated-name');
        expect(st.artefacts.items.length).toBe(1);
    });

    it('adds the new artefact to the current imaged object when the ids match', () => {
        const edition = new EditionInfo(makeEditionDto({ id: 1 }));
        const io = new ImagedObject(makeImagedObjectDto('IO-M'), edition);
        st.imagedObjects.add(io);
        st.imagedObjects.current = st.imagedObjects.find('IO-M');
        handler.handleCreatedArtefact(makeArtefactDto({ id: 13, imagedObjectId: 'IO-M' }));
        expect(st.imagedObjects.current!.artefacts.some(a => a.id === 13)).toBe(true);
    });
});

describe('handleDeletedArtefact', () => {
    it('removes each artefact id and also from the current imaged object', () => {
        const edition = new EditionInfo(makeEditionDto({ id: 1 }));
        const io = new ImagedObject(makeImagedObjectDto('IO-D'), edition);
        st.imagedObjects.add(io);
        st.imagedObjects.current = st.imagedObjects.find('IO-D');
        handler.handleCreatedArtefact(makeArtefactDto({ id: 21, imagedObjectId: 'IO-D' }));
        handler.handleCreatedArtefact(makeArtefactDto({ id: 22, imagedObjectId: 'IO-D' }));
        const del: DeleteIntIdDTO = { entity: 'artefact', ids: [21, 22] } as unknown as DeleteIntIdDTO;
        handler.handleDeletedArtefact(del);
        expect(st.artefacts.find(21)).toBeNull();
        expect(st.artefacts.find(22)).toBeNull();
        expect(st.imagedObjects.current!.artefacts.length).toBe(0);
    });

    it('tolerates deleting an artefact we do not hold', () => {
        const del: DeleteIntIdDTO = { entity: 'artefact', ids: [999] } as unknown as DeleteIntIdDTO;
        expect(() => handler.handleDeletedArtefact(del)).not.toThrow();
    });
});

describe('applyArtefactUpdate diff paths (via handleUpdatedArtefact / applyArtefactDto)', () => {
    it('backfills a missing mask from the existing artefact', () => {
        st.artefacts.add(new Artefact(makeArtefactDto({ id: 30 })));
        const before = st.artefacts.items;
        // dto with NO mask + no other change -> mask backfilled -> render-equal -> no write
        const dto = makeArtefactDto({ id: 30 });
        delete (dto as any).mask;
        handler.handleUpdatedArtefact(dto);
        expect(st.artefacts.items).toBe(before); // diff skipped the write
        expect(st.artefacts.find(30)!.mask.wkt).toContain('10 10'); // kept old mask
    });

    it('a name-only change triggers a reactive write', () => {
        st.artefacts.add(new Artefact(makeArtefactDto({ id: 31 })));
        const before = st.artefacts.items;
        handler.handleUpdatedArtefact(makeArtefactDto({ id: 31, name: 'different' }));
        expect(st.artefacts.items).not.toBe(before);
        expect(st.artefacts.find(31)!.name).toBe('different');
    });

    it('an isPlaced/side change triggers a write', () => {
        st.artefacts.add(new Artefact(makeArtefactDto({ id: 32, isPlaced: true, side: 'recto' })));
        const before = st.artefacts.items;
        handler.handleUpdatedArtefact(makeArtefactDto({ id: 32, isPlaced: false, side: 'verso' }));
        expect(st.artefacts.items).not.toBe(before);
        expect(st.artefacts.find(32)!.isPlaced).toBe(false);
        expect(st.artefacts.find(32)!.side).toBe('verso');
    });

    it('applyArtefactDto adds when the artefact is not held', () => {
        applyArtefactDto(makeArtefactDto({ id: 33 }));
        expect(st.artefacts.find(33)).toBeTruthy();
    });

    it('pending-op guard: a foreign update is dropped while the entity is locally dirty', () => {
        st.artefacts.add(new Artefact(makeArtefactDto({ id: 34, name: 'mine' })));
        st.operationsManager = {
            isEntityDirty: (id: number) => id === 34,
        } as any;
        const before = st.artefacts.items;
        // foreign (no opId, not own) update -> guarded -> ignored
        handler.handleUpdatedArtefact(makeArtefactDto({ id: 34, name: 'theirs' }));
        expect(st.artefacts.items).toBe(before);
        expect(st.artefacts.find(34)!.name).toBe('mine');
    });

    it('pending-op guard is bypassed for our own confirmed change (isOwnChange)', () => {
        st.artefacts.add(new Artefact(makeArtefactDto({ id: 35, name: 'mine' })));
        st.operationsManager = {
            isEntityDirty: (id: number) => id === 35,
        } as any;
        applyArtefactDto(makeArtefactDto({ id: 35, name: 'saved' }), true);
        expect(st.artefacts.find(35)!.name).toBe('saved');
    });

    it('pending-op guard is bypassed when the broadcast carries our registered opId', () => {
        st.artefacts.add(new Artefact(makeArtefactDto({ id: 36, name: 'mine' })));
        st.operationsManager = {
            isEntityDirty: (id: number) => id === 36,
        } as any;
        registerPendingOperation('op-xyz');
        handler.handleUpdatedArtefact(
            makeArtefactDto({ id: 36, name: 'echoed', operationId: 'op-xyz' } as any),
        );
        expect(st.artefacts.find(36)!.name).toBe('echoed');
    });
});

describe('handleCreatedEditor', () => {
    it('adds a new share to the edition', () => {
        st.editions.add(new EditionInfo(makeEditionDto({ id: 1 })));
        const dto: DetailedEditorRightsDTO = {
            editionId: 1,
            email: 'new@editor.com',
            mayRead: true,
            mayWrite: false,
            isAdmin: false,
            mayLock: false,
        };
        handler.handleCreatedEditor(dto);
        const ed = st.editions.find(1)!;
        expect(ed.shares.some(s => s.email === 'new@editor.com')).toBe(true);
    });

    it('replaces an existing share for the same email', () => {
        st.editions.add(new EditionInfo(makeEditionDto({ id: 1 })));
        const base = { editionId: 1, email: 'e@e.com', mayLock: false };
        handler.handleCreatedEditor({ ...base, mayRead: true, mayWrite: false, isAdmin: false } as DetailedEditorRightsDTO);
        handler.handleCreatedEditor({ ...base, mayRead: true, mayWrite: true, isAdmin: false } as DetailedEditorRightsDTO);
        const ed = st.editions.find(1)!;
        const shares = ed.shares.filter(s => s.email === 'e@e.com');
        expect(shares.length).toBe(1);
        expect(shares[0].permissions.mayWrite).toBe(true);
    });

    it('updates own permissions when the changed editor is the logged-in user', () => {
        st.editions.add(new EditionInfo(makeEditionDto({ id: 1 })));
        st.session.user = { userId: 9, email: 'me@me.com', activated: true } as any;
        const dto: DetailedEditorRightsDTO = {
            editionId: 1,
            email: 'me@me.com',
            mayRead: true,
            mayWrite: true,
            isAdmin: true,
            mayLock: true,
        };
        handler.handleCreatedEditor(dto);
        expect(st.editions.find(1)!.permission.isAdmin).toBe(true);
        st.session.user = null;
    });

    it('ignores an editor notification for an unknown edition', () => {
        const dto: DetailedEditorRightsDTO = {
            editionId: 777,
            email: 'x@x.com',
            mayRead: true,
            mayWrite: false,
            isAdmin: false,
            mayLock: false,
        };
        expect(() => handler.handleCreatedEditor(dto)).not.toThrow();
    });
});

describe('ROI notification handlers', () => {
    it('handleCreatedRoi adds a ROI to the map and fires roi-changed', () => {
        st.artefacts.add(new Artefact(makeArtefactDto({ id: 1 })));
        let fired = false;
        st.eventBus.on('roi-changed', () => { fired = true; });
        handler.handleCreatedRoi(makeRoiDto(300, 1));
        expect(st.interpretationRois.get(300)).toBeTruthy();
        expect(fired).toBe(true);
    });

    it('handleCreatedRoisBatch adds every ROI in the list', () => {
        st.artefacts.add(new Artefact(makeArtefactDto({ id: 1 })));
        const list: InterpretationRoiDTOList = { rois: [makeRoiDto(301, 1), makeRoiDto(302, 1)] };
        handler.handleCreatedRoisBatch(list);
        expect(st.interpretationRois.get(301)).toBeTruthy();
        expect(st.interpretationRois.get(302)).toBeTruthy();
    });

    it('handleDeletedRoi removes the ROIs by id', () => {
        st.artefacts.add(new Artefact(makeArtefactDto({ id: 1 })));
        handler.handleCreatedRoi(makeRoiDto(303, 1));
        const del: DeleteIntIdDTO = { entity: 'roi', ids: [303] } as unknown as DeleteIntIdDTO;
        handler.handleDeletedRoi(del);
        expect(st.interpretationRois.get(303)).toBeUndefined();
    });

    it('handleUpdatedRoi replaces the old ROI with the new one', () => {
        st.artefacts.add(new Artefact(makeArtefactDto({ id: 1 })));
        handler.handleCreatedRoi(makeRoiDto(304, 1));
        const upd: UpdatedInterpretationRoiDTO = {
            ...makeRoiDto(305, 1),
            oldInterpretationRoiId: 304,
        } as unknown as UpdatedInterpretationRoiDTO;
        handler.handleUpdatedRoi(upd);
        expect(st.interpretationRois.get(304)).toBeUndefined();
        expect(st.interpretationRois.get(305)).toBeTruthy();
    });

    it('handleUpdatedRoisBatch applies each update', () => {
        st.artefacts.add(new Artefact(makeArtefactDto({ id: 1 })));
        handler.handleCreatedRoi(makeRoiDto(306, 1));
        const list = {
            rois: [
                { ...makeRoiDto(307, 1), oldInterpretationRoiId: 306 } as unknown as UpdatedInterpretationRoiDTO,
            ],
        };
        handler.handleUpdatedRoisBatch(list);
        expect(st.interpretationRois.get(306)).toBeUndefined();
        expect(st.interpretationRois.get(307)).toBeTruthy();
    });

    it('handleEditedRoisBatch creates, updates and deletes ROIs in one shot', () => {
        st.artefacts.add(new Artefact(makeArtefactDto({ id: 1 })));
        handler.handleCreatedRoi(makeRoiDto(308, 1)); // to be deleted
        handler.handleCreatedRoi(makeRoiDto(309, 1)); // to be updated
        const batch: BatchEditRoiResponseDTO = {
            createRois: [makeRoiDto(310, 1)],
            updateRois: [
                { ...makeRoiDto(311, 1), oldInterpretationRoiId: 309 } as unknown as UpdatedInterpretationRoiDTO,
            ],
            deleteRois: [308],
        };
        handler.handleEditedRoisBatch(batch);
        expect(st.interpretationRois.get(310)).toBeTruthy(); // created
        expect(st.interpretationRois.get(308)).toBeUndefined(); // deleted
        expect(st.interpretationRois.get(309)).toBeUndefined(); // updated away
        expect(st.interpretationRois.get(311)).toBeTruthy(); // update result
    });

    it('handleDeletedRoi tolerates deleting an unknown ROI', () => {
        const del: DeleteIntIdDTO = { entity: 'roi', ids: [9999] } as unknown as DeleteIntIdDTO;
        expect(() => handler.handleDeletedRoi(del)).not.toThrow();
    });
});

describe('handleUpdatedSignInterpretation', () => {
    it('warns and no-ops for a non-existent sign interpretation', () => {
        expect(() =>
            handler.handleUpdatedSignInterpretation({
                signId: 1,
                signInterpretationId: 9999,
                character: 'x',
                isVariant: false,
                nextSignInterpretations: [],
                attributes: [],
                rois: [],
                signStreamSectionIds: [],
                qwbWordIds: [],
            } as any),
        ).not.toThrow();
    });

    it('handleUpdatedSignInterpretations iterates the list without throwing on empty', () => {
        expect(() => handler.handleUpdatedSignInterpretations({ signInterpretations: [] })).not.toThrow();
        expect(() => handler.handleUpdatedSignInterpretations({} as any)).not.toThrow();
    });
});
