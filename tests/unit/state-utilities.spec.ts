import { describe, it, expect, beforeEach } from 'vitest';
import { StateManager } from '@/state';
import { Artefact } from '@/models/artefact';
import { ImagedObject } from '@/models/imaged-object';
import { EditionInfo, ArtefactGroup } from '@/models/edition';
import {
    ArtefactCollection,
    ArtefactGroupsMap,
    ImageCache,
    InterpretationRoiMap,
    SignInterpretationMap,
    MiscState,
} from '@/state/utilities';
import { InterpretationRoi, SignInterpretation, TextFragment } from '@/models/text';
import type {
    ArtefactDTO,
    ImagedObjectDTO,
    EditionDTO,
    ArtefactGroupDTO,
    InterpretationRoiDTO,
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

function art(id: number): Artefact {
    return new Artefact(makeArtefactDto({ id }));
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
        ...over,
    } as EditionDTO;
}

function makeImagedObjectDto(id: string): ImagedObjectDTO {
    return {
        id,
        recto: { images: [] },
        verso: { images: [] },
        artefacts: [],
    } as unknown as ImagedObjectDTO;
}

function makeArtefactGroupDto(id: number, artefacts: number[] = [], name = 'g'): ArtefactGroupDTO {
    return { id, name, artefacts } as ArtefactGroupDTO;
}

describe('StateCollection (via ArtefactCollection)', () => {
    let c: ArtefactCollection;
    beforeEach(() => {
        c = new ArtefactCollection();
    });

    it('starts empty with null current', () => {
        expect(c.items).toEqual([]);
        expect(c.current).toBeNull();
    });

    it('add appends and replaces the array (reactive copy)', () => {
        const before = c.items;
        c.add(art(1));
        expect(c.items).not.toBe(before);
        expect(c.items.length).toBe(1);
        expect(c.find(1)!.id).toBe(1);
    });

    it('add throws when adding a duplicate by default', () => {
        c.add(art(1));
        expect(() => c.add(art(1))).toThrow(/already in the collection/);
    });

    it('add with failIfExisting=false silently ignores a duplicate', () => {
        c.add(art(1));
        const before = c.items;
        c.add(art(1), false);
        expect(c.items).toBe(before); // no write happened
        expect(c.items.length).toBe(1);
    });

    it('find returns null on miss', () => {
        c.add(art(1));
        expect(c.find(999)).toBeNull();
    });

    it('update replaces the entity and the array', () => {
        c.add(art(1));
        const before = c.items;
        const replacement = art(1);
        replacement.name = 'renamed';
        c.update(replacement);
        expect(c.items).not.toBe(before);
        expect(c.find(1)!.name).toBe('renamed');
        expect(c.find(1)).toBe(replacement);
    });

    it('update throws when entity is missing by default', () => {
        expect(() => c.update(art(5))).toThrow(/it is not in the collection/);
    });

    it('update with failIfNotFound=false does not throw on a miss', () => {
        expect(() => c.update(art(5), false)).not.toThrow();
    });

    it('remove deletes the entity', () => {
        c.add(art(1));
        c.add(art(2));
        c.remove(1);
        expect(c.find(1)).toBeNull();
        expect(c.find(2)!.id).toBe(2);
    });

    it('remove throws when missing by default', () => {
        expect(() => c.remove(42)).toThrow(/Can't delete entity 42/);
    });

    it('remove with failIfNotFound=false does not throw on a miss', () => {
        expect(() => c.remove(42, false)).not.toThrow();
    });

    it('remove clears current when the removed entity was current', () => {
        const a = art(1);
        c.add(a);
        c.current = a;
        expect(c.current).toBe(a);
        c.remove(1);
        expect(c.current).toBeNull();
    });

    it('upsert adds when absent', () => {
        c.upsert(art(3));
        expect(c.find(3)!.id).toBe(3);
    });

    it('upsert updates when present', () => {
        c.add(art(3));
        const replacement = art(3);
        replacement.name = 'new';
        c.upsert(replacement);
        expect(c.find(3)).toBe(replacement);
        expect(c.find(3)!.name).toBe('new');
    });

    it('items setter clears current', () => {
        const a = art(1);
        c.add(a);
        c.current = a;
        c.items = [art(2)];
        expect(c.current).toBeNull();
        expect(c.items.length).toBe(1);
    });

    it('current setter with null clears current', () => {
        const a = art(1);
        c.add(a);
        c.current = a;
        c.current = null;
        expect(c.current).toBeNull();
    });

    it('current setter keeps items when the item exists in the collection', () => {
        const a = art(1);
        c.add(a);
        const before = c.items;
        c.current = a;
        expect(c.current).toBe(a);
        expect(c.items).toBe(before); // not reset since item is present
    });

    it('current setter resets items when the item is NOT in the collection', () => {
        c.add(art(1));
        expect(c.items.length).toBe(1);
        // Set an item not in the collection -> items reset so list reloads later
        c.current = art(99);
        expect(c.items).toEqual([]);
        expect(c.current!.id).toBe(99);
    });

    it('replaceItems (via update) preserves current when it survives', () => {
        const a = art(1);
        c.add(a);
        c.add(art(2));
        c.current = a;
        // Update artefact 2 -> current (1) still exists, should be preserved
        const two = art(2);
        two.name = 'x';
        c.update(two);
        expect(c.current!.id).toBe(1);
    });

    it('replaceItems clears current when current no longer exists after remove', () => {
        const a = art(1);
        c.add(a);
        c.add(art(2));
        c.current = a;
        c.remove(1);
        expect(c.current).toBeNull();
    });
});

describe('EditionCollection', () => {
    it('holds EditionInfo entities keyed by id', () => {
        const st2 = StateManager.instance;
        st2.editions.items = [];
        const e = new EditionInfo(makeEditionDto({ id: 7 }));
        st2.editions.add(e);
        // The store is a reactive proxy, so find() returns a proxy of `e` (equal
        // by value/id, not by identity).
        expect(st2.editions.find(7)!.id).toBe(7);
        expect(st2.editions.find(7)!.name).toBe('ed 1');
        st2.editions.items = [];
    });
});

describe('ImagedObjectCollection (string ids)', () => {
    beforeEach(() => {
        st.imagedObjects.items = [];
        st.editions.items = [];
    });

    it('add/find/remove with string ids', () => {
        const edition = new EditionInfo(makeEditionDto({ id: 1 }));
        const io = new ImagedObject(makeImagedObjectDto('IO-A'), edition);
        st.imagedObjects.add(io);
        // Store is a reactive proxy -> compare by id, not identity.
        expect(st.imagedObjects.find('IO-A')!.id).toBe('IO-A');
        expect(st.imagedObjects.find('missing')).toBeNull();
        st.imagedObjects.remove('IO-A');
        expect(st.imagedObjects.find('IO-A')).toBeNull();
    });
});

describe('ArtefactGroupsMap (StateMap)', () => {
    let m: ArtefactGroupsMap;
    beforeEach(() => {
        m = new ArtefactGroupsMap();
    });

    it('put/get by id', () => {
        const g = new ArtefactGroup(makeArtefactGroupDto(5, [1, 2]));
        m.put(g);
        expect(m.get(5)).toBe(g);
        expect(m.size).toBe(1);
    });

    it('get returns undefined on miss', () => {
        expect(m.get(123)).toBeUndefined();
    });

    it('keys and getItems iterate entries', () => {
        m.put(new ArtefactGroup(makeArtefactGroupDto(1)));
        m.put(new ArtefactGroup(makeArtefactGroupDto(2)));
        expect([...m.keys].sort()).toEqual([1, 2]);
        expect([...m.getItems()].map(g => g.id).sort()).toEqual([1, 2]);
    });

    it('setItems clears then repopulates', () => {
        m.put(new ArtefactGroup(makeArtefactGroupDto(1)));
        m.setItems([new ArtefactGroup(makeArtefactGroupDto(9))]);
        expect(m.size).toBe(1);
        expect(m.get(1)).toBeUndefined();
        expect(m.get(9)).toBeTruthy();
    });

    it('delete removes an entry', () => {
        m.put(new ArtefactGroup(makeArtefactGroupDto(3)));
        m.delete(3);
        expect(m.get(3)).toBeUndefined();
    });

    it('clear empties the map', () => {
        m.put(new ArtefactGroup(makeArtefactGroupDto(3)));
        m.clear();
        expect(m.size).toBe(0);
    });

    it('frontend/server id mapping resolves via considerServerIds', () => {
        const g = new ArtefactGroup(makeArtefactGroupDto(-1));
        m.put(g);
        m.mapFrontendIdToServerId(-1, 500);
        // ask for the server id, with considerServerIds -> resolves to the frontend entry
        expect(m.get(500, true)).toBe(g);
        // ask for frontend id -> also resolvable
        expect(m.get(-1, true)).toBe(g);
        expect(m.getServerId(-1)).toBe(500);
    });

    it('get with considerServerIds returns undefined for a fully unknown id', () => {
        expect(m.get(9999, true)).toBeUndefined();
    });
});

function makeRoiDto(artefactId: number, siId: number | undefined, id: number): InterpretationRoiDTO {
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

function makeSi(siId: number, rois: InterpretationRoiDTO[]): SignInterpretation {
    const dto: TextFragmentDTO = {
        textFragmentId: 1,
        textFragmentName: 'tf',
        editorId: 1,
        lines: [
            {
                lineId: 10,
                lineName: 'l',
                editorId: 1,
                signs: [
                    {
                        signInterpretations: [
                            {
                                signId: siId,
                                signInterpretationId: siId,
                                character: 'א',
                                isVariant: false,
                                nextSignInterpretations: [],
                                attributes: [],
                                rois,
                                signStreamSectionIds: [],
                                qwbWordIds: [],
                            } as unknown as SignInterpretationDTO,
                        ],
                    },
                ],
            },
        ],
    } as unknown as TextFragmentDTO;
    const tf = new TextFragment(dto);
    return tf.lines[0].signs[0].signInterpretations[0];
}

describe('InterpretationRoiMap', () => {
    beforeEach(() => {
        st.artefacts.items = [];
    });

    it('put attaches the ROI to its artefact; delete detaches it', () => {
        st.artefacts.add(art(1));
        const map = new InterpretationRoiMap();
        const roi = new InterpretationRoi(makeRoiDto(1, 7, 100));
        map.put(roi);
        expect(map.get(100)).toBe(roi);
        const artefact = st.artefacts.find(1)!;
        expect(artefact.rois.some(r => r.id === 100)).toBe(true);
        map.delete(100);
        expect(map.get(100)).toBeUndefined();
        expect(artefact.rois.some(r => r.id === 100)).toBe(false);
    });

    it('delete warns and no-ops for a ROI not in the map', () => {
        const map = new InterpretationRoiMap();
        expect(() => map.delete(999)).not.toThrow();
    });

    it('put warns (but still stores) when the artefact is not in state', () => {
        const map = new InterpretationRoiMap();
        const roi = new InterpretationRoi(makeRoiDto(4040, 1, 101));
        map.put(roi);
        expect(map.get(101)).toBe(roi);
    });

    it('clear empties artefact rois and the map', () => {
        st.artefacts.add(art(1));
        const map = new InterpretationRoiMap();
        map.put(new InterpretationRoi(makeRoiDto(1, 7, 102)));
        map.clear();
        expect(map.size).toBe(0);
        expect(st.artefacts.find(1)!.rois.length).toBe(0);
    });
});

describe('SignInterpretationMap', () => {
    beforeEach(() => {
        st.artefacts.items = [];
        st.signInterpretations.clear();
    });

    it('put attaches the SI to the artefacts referenced by its ROIs', () => {
        st.artefacts.add(art(1));
        const si = makeSi(50, [makeRoiDto(1, 50, 200)]);
        st.signInterpretations.put(si);
        // Store is reactive -> get() returns a proxy; compare by id.
        expect(st.signInterpretations.get(50)!.id).toBe(50);
        expect(st.artefacts.find(1)!.signInterpretations.some(s => s.id === 50)).toBe(true);
    });

    it('delete detaches the SI from its artefacts', () => {
        st.artefacts.add(art(1));
        const si = makeSi(51, [makeRoiDto(1, 51, 201)]);
        st.signInterpretations.put(si);
        st.signInterpretations.delete(51);
        expect(st.artefacts.find(1)!.signInterpretations.some(s => s.id === 51)).toBe(false);
    });

    it('delete warns and no-ops for an unknown SI', () => {
        expect(() => st.signInterpretations.delete(9999)).not.toThrow();
    });

    it('attach warns when a ROI artefact is not in state', () => {
        const si = makeSi(52, [makeRoiDto(4141, 52, 202)]);
        expect(() => st.signInterpretations.put(si)).not.toThrow();
        expect(st.signInterpretations.get(52)!.id).toBe(52);
    });

    it('clear empties artefact signInterpretations and the map', () => {
        st.artefacts.add(art(1));
        st.signInterpretations.put(makeSi(53, [makeRoiDto(1, 53, 203)]));
        st.signInterpretations.clear();
        expect(st.signInterpretations.size).toBe(0);
        expect(st.artefacts.find(1)!.signInterpretations.length).toBe(0);
    });
});

describe('ImageCache (StateCache LRU)', () => {
    it('put/get round-trips and get is a no-op miss', () => {
        const cache = new ImageCache(2);
        const a = { id: 1 } as any;
        cache.put(1, a);
        expect(cache.get(1)).toBe(a);
        expect(cache.get(2)).toBeUndefined();
    });

    it('evicts the least-recently-used entry past capacity', () => {
        const cache = new ImageCache(2);
        cache.put(1, { id: 1 } as any);
        cache.put(2, { id: 2 } as any);
        // Touch key 1 so key 2 becomes the LRU
        cache.get(1);
        cache.put(3, { id: 3 } as any);
        expect(cache.get(2)).toBeUndefined(); // evicted
        expect(cache.get(1)).toBeTruthy();
        expect(cache.get(3)).toBeTruthy();
    });
});

describe('MiscState', () => {
    it('has sensible defaults for the edition search bar', () => {
        const misc = new MiscState();
        expect(misc.editionSearchBarValue.sort).toBe('lastEdit');
        expect(misc.editionSearchBarValue.side).toBe('recto and verso');
        expect(misc.reportIssueData).toBeUndefined();
    });

    it('allows setting newEditionId and reportIssueData', () => {
        const misc = new MiscState();
        misc.newEditionId = 42;
        misc.reportIssueData = { title: 't', description: 'd' };
        expect(misc.newEditionId).toBe(42);
        expect(misc.reportIssueData.title).toBe('t');
    });
});
