import { describe, it, expect } from 'vitest';
import {
    Permissions,
    UserInfo,
    ShareInfo,
    EditionInfo,
    ArtefactGroup,
    AttributeMetadata,
} from '@/models/edition';
import type {
    EditionDTO,
    PermissionDTO,
    UserDTO,
    DetailedEditorRightsDTO,
    ArtefactGroupDTO,
    AttributeListDTO,
    EditionManuscriptMetricsDTO,
} from '@/dtos/sqe-dtos';

function perm(over: Partial<PermissionDTO> = {}): PermissionDTO {
    return { mayRead: true, mayWrite: false, isAdmin: false, ...over };
}

function metrics(over: Partial<EditionManuscriptMetricsDTO> = {}): EditionManuscriptMetricsDTO {
    return { width: 100, height: 200, xOrigin: 0, yOrigin: 0, ppi: 1270, editorId: 1, ...over };
}

function makeEditionDto(over: Partial<EditionDTO> = {}): EditionDTO {
    return {
        id: 1,
        name: 'Edition 1',
        manuscriptId: 10,
        editionDataEditorId: 1,
        permission: perm({ mayWrite: true }),
        owner: { userId: 5, email: 'a@b.com' } as UserDTO,
        metrics: metrics(),
        locked: false,
        isPublic: true,
        copyright: '(c) 2020',
        ...over,
    } as EditionDTO;
}

describe('edition — Permissions', () => {
    it('extractPermission admin cascades to write/read/lock', () => {
        const r = Permissions.extractPermission('admin');
        expect(r).toEqual({ mayRead: true, mayWrite: true, isAdmin: true, mayLock: true });
    });

    it('extractPermission write grants write+read only', () => {
        expect(Permissions.extractPermission('write')).toEqual({
            mayRead: true, mayWrite: true, isAdmin: false, mayLock: false,
        });
    });

    it('extractPermission read grants read only', () => {
        expect(Permissions.extractPermission('read')).toEqual({
            mayRead: true, mayWrite: false, isAdmin: false, mayLock: false,
        });
    });

    it('extractPermission none grants nothing', () => {
        expect(Permissions.extractPermission('none')).toEqual({
            mayRead: false, mayWrite: false, isAdmin: false, mayLock: false,
        });
    });

    it('constructs from DTO and exposes readOnly', () => {
        expect(new Permissions(perm({ mayWrite: true })).readOnly).toBe(false);
        expect(new Permissions(perm({ mayWrite: false })).readOnly).toBe(true);
    });

    it('simplified reflects the highest granted level', () => {
        expect(new Permissions(perm({ isAdmin: true })).simplified).toBe('admin');
        expect(new Permissions(perm({ mayWrite: true })).simplified).toBe('write');
        expect(new Permissions(perm({ mayRead: true })).simplified).toBe('read');
        expect(new Permissions(perm({ mayRead: false })).simplified).toBe('none');
    });
});

describe('edition — UserInfo', () => {
    it('constructs from DTO with empty forename', () => {
        const u = new UserInfo({ userId: 3, email: 'x@y.com' } as UserDTO);
        expect(u.userId).toBe(3);
        expect(u.email).toBe('x@y.com');
        expect(u.forename).toBe('');
    });
});

describe('edition — ShareInfo', () => {
    function rightsDto(over: Partial<DetailedEditorRightsDTO> = {}): DetailedEditorRightsDTO {
        return {
            email: 's@share.com',
            editionId: 1,
            mayRead: true,
            mayWrite: true,
            isAdmin: false,
            mayLock: false,
            ...over,
        };
    }

    it('fromDTO builds a ShareInfo with permissions', () => {
        const s = ShareInfo.fromDTO(rightsDto());
        expect(s.email).toBe('s@share.com');
        expect(s.permissions.mayWrite).toBe(true);
    });

    it('simplified delegates to permissions', () => {
        expect(ShareInfo.fromDTO(rightsDto({ isAdmin: true })).simplified).toBe('admin');
    });

    it('constructor stores provided email + permissions', () => {
        const p = new Permissions(perm());
        const s = new ShareInfo('direct@x.com', p);
        expect(s.email).toBe('direct@x.com');
        expect(s.permissions).toBe(p);
    });
});

describe('edition — AttributeMetadata', () => {
    function listDto(): AttributeListDTO {
        return {
            attributes: [
                {
                    attributeId: 1,
                    attributeName: 'sign_type',
                    editable: true, removable: false, repeatable: false, batchEditable: true,
                    creatorId: 0, editorId: 0,
                    values: [
                        { id: 10, value: 'LETTER', creatorId: 0, editorId: 0 },
                        { id: 11, value: 'SPACE', creatorId: 0, editorId: 0 },
                    ],
                },
                {
                    attributeId: 2,
                    attributeName: 'damage',
                    editable: true, removable: true, repeatable: true, batchEditable: false,
                    creatorId: 0, editorId: 0,
                    values: [{ id: 20, value: 'partial', creatorId: 0, editorId: 0 }],
                },
            ] as any,
        };
    }

    it('allAttributes returns all', () => {
        const m = new AttributeMetadata(listDto());
        expect(m.allAttributes).toHaveLength(2);
    });

    it('multiSelectAttributes filters by batchEditable', () => {
        const m = new AttributeMetadata(listDto());
        expect(m.multiSelectAttributes).toHaveLength(1);
        expect(m.multiSelectAttributes[0].attributeId).toBe(1);
    });

    it('getAttribute finds by id or returns undefined', () => {
        const m = new AttributeMetadata(listDto());
        expect(m.getAttribute(2)!.attributeName).toBe('damage');
        expect(m.getAttribute(999)).toBeUndefined();
    });

    it('getAttributeValue finds a value under an attribute', () => {
        const m = new AttributeMetadata(listDto());
        expect(m.getAttributeValue(1, 11)!.value).toBe('SPACE');
    });

    it('getAttributeValue returns undefined for unknown attribute or value', () => {
        const m = new AttributeMetadata(listDto());
        expect(m.getAttributeValue(999, 11)).toBeUndefined();
        expect(m.getAttributeValue(1, 999)).toBeUndefined();
    });
});

describe('edition — EditionInfo', () => {
    it('constructs from DTO with defaults', () => {
        const e = new EditionInfo(makeEditionDto());
        expect(e.id).toBe(1);
        expect(e.name).toBe('Edition 1');
        expect(e.manuscriptId).toBe(10);
        expect(e.copyright).toBe('(c) 2020');
        expect(e.permission.mayWrite).toBe(true);
        expect(e.owner.userId).toBe(5);
        expect(e.isPublic).toBe(true);
        expect(e.locked).toBe(false);
        expect(e.shares).toEqual([]);
        expect(e.publicCopies).toBe(1);
        expect(e.mine).toBe(false);
        expect(e.script).toBeNull();
    });

    it('ppm converts ppi to pixels-per-mm', () => {
        const e = new EditionInfo(makeEditionDto({ metrics: metrics({ ppi: 25.4 }) }));
        expect(e.ppm).toBeCloseTo(1);
    });

    it('substitutes default metrics for zero width/height', () => {
        const e = new EditionInfo(makeEditionDto({ metrics: metrics({ width: 0, height: 0 }) }));
        expect(e.metrics.width).toBe(1000);
        expect(e.metrics.height).toBe(500);
    });

    it('builds a thumbnail when thumbnailUrl is present', () => {
        const e = new EditionInfo(makeEditionDto({ thumbnailUrl: 'http://iiif/thumb' }));
        expect(e.thumbnail).toBeDefined();
        expect(e.thumbnail!.url).toBe('http://iiif/thumb');
    });

    it('has no thumbnail when thumbnailUrl absent', () => {
        expect(new EditionInfo(makeEditionDto()).thumbnail).toBeUndefined();
    });

    it('maps shares from DTO', () => {
        const e = new EditionInfo(makeEditionDto({
            shares: [{
                email: 'x@x.com', editionId: 1, mayRead: true, mayWrite: false,
                isAdmin: false, mayLock: false,
            }],
        }));
        expect(e.shares).toHaveLength(1);
        expect(e.shares[0].email).toBe('x@x.com');
    });

    it('parses lastEdit when provided, undefined otherwise', () => {
        const withEdit = new EditionInfo(makeEditionDto({ lastEdit: '2021-01-02T00:00:00Z' }));
        expect(withEdit.lastEdit).toBeInstanceOf(Date);
        expect(new EditionInfo(makeEditionDto()).lastEdit).toBeUndefined();
    });

    it('updateLastEdit sets and clears the date', () => {
        const e = new EditionInfo(makeEditionDto());
        e.updateLastEdit('2022-05-05T00:00:00Z');
        expect(e.lastEdit).toBeInstanceOf(Date);
        e.updateLastEdit(undefined);
        expect(e.lastEdit).toBeUndefined();
    });

    it('copyFrom copies mutable fields from another edition', () => {
        const a = new EditionInfo(makeEditionDto({ id: 1, name: 'A' }));
        const b = new EditionInfo(makeEditionDto({ id: 2, name: 'B', locked: true }));
        a.copyFrom(b);
        expect(a.id).toBe(1); // id NOT copied
        expect(a.name).toBe('B');
        expect(a.locked).toBe(true);
    });
});

describe('edition — ArtefactGroup', () => {
    function groupDto(over: Partial<ArtefactGroupDTO> = {}): ArtefactGroupDTO {
        return { id: 1, name: 'grp', artefacts: [1, 2, 3], ...over };
    }

    it('constructs from DTO', () => {
        const g = new ArtefactGroup(groupDto());
        expect(g.groupId).toBe(1);
        expect(g.id).toBe(1);
        expect(g.name).toBe('grp');
        expect(g.artefactIds).toEqual([1, 2, 3]);
        expect(g.notSave).toBeUndefined();
    });

    it('honours notSave flag', () => {
        expect(new ArtefactGroup(groupDto(), true).notSave).toBe(true);
    });

    it('copies the artefacts array (no aliasing)', () => {
        const dto = groupDto();
        const g = new ArtefactGroup(dto);
        g.artefactIds.push(4);
        expect(dto.artefacts).toEqual([1, 2, 3]);
    });

    it('generateGroup allocates a decreasing negative id', () => {
        const before = ArtefactGroup.nextGroupId;
        const g = ArtefactGroup.generateGroup([7, 8]);
        expect(g.groupId).toBe(before);
        expect(g.name).toBe('');
        expect(g.artefactIds).toEqual([7, 8]);
        expect(ArtefactGroup.nextGroupId).toBe(before - 1);
    });

    it('generateGroup forwards notSave', () => {
        expect(ArtefactGroup.generateGroup([1], true).notSave).toBe(true);
    });

    it('clone produces an equal but distinct group', () => {
        const g = new ArtefactGroup(groupDto());
        const c = g.clone();
        expect(c).not.toBe(g);
        expect(c.groupId).toBe(g.groupId);
        expect(c.name).toBe(g.name);
        expect(c.artefactIds).toEqual(g.artefactIds);
        expect(c.artefactIds).not.toBe(g.artefactIds);
    });
});
