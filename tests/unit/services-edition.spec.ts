import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StateManager } from '@/state';
import { EditionInfo, ArtefactGroup } from '@/models/edition';
import type {
    EditionDTO,
    UserDTO,
    PermissionDTO,
} from '@/dtos/sqe-dtos';

vi.mock('@/services/comm-helper', () => ({
    CommHelper: {
        get: vi.fn(),
        put: vi.fn(),
        post: vi.fn(),
        delete: vi.fn(),
    },
}));

import { CommHelper } from '@/services/comm-helper';
import EditionService from '@/services/edition';

const comm = CommHelper as unknown as {
    get: ReturnType<typeof vi.fn>;
    put: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
};

const perm: PermissionDTO = { mayRead: true, mayWrite: true, isAdmin: true };

function userDto(over: Partial<UserDTO> = {}): UserDTO {
    return { userId: 1, email: 'a@b.com', ...over };
}

function editionDto(over: Partial<EditionDTO> = {}): EditionDTO {
    return {
        id: 1,
        name: 'Edition 1',
        manuscriptId: 10,
        editionDataEditorId: 1,
        permission: perm,
        owner: userDto(),
        shares: [],
        metrics: { width: 100, height: 100, xOrigin: 0, yOrigin: 0 } as any,
        locked: false,
        isPublic: false,
        copyright: '',
        lastEdit: '2020-01-01T00:00:00',
        ...over,
    } as EditionDTO;
}

const st = StateManager.instance;

describe('EditionService', () => {
    let svc: EditionService;
    beforeEach(() => {
        vi.clearAllMocks();
        st.editions.items = [];
        st.session.user = null as any;
        svc = new EditionService();
    });

    describe('getAllEditions', () => {
        it('flattens groups, sets mine=false when no user', async () => {
            comm.get.mockResolvedValue({
                data: { editions: [[editionDto({ id: 1 }), editionDto({ id: 2 })]] },
            });
            const list = await svc.getAllEditions();
            expect(list.length).toBe(2);
            expect(list[0].mine).toBe(false);
            expect(list[0].otherVersions.length).toBe(1);
            expect(list[0].publicCopies).toBe(0);
        });

        it('sets mine=true when the logged-in user owns it', async () => {
            st.session.user = { userId: 1, email: 'a@b.com' } as any;
            comm.get.mockResolvedValue({
                data: {
                    editions: [
                        [
                            editionDto({ id: 1, owner: userDto({ userId: 1 }), isPublic: true }),
                            editionDto({ id: 2, owner: userDto({ userId: 99 }) }),
                        ],
                    ],
                },
            });
            const list = await svc.getAllEditions();
            expect(list.find(e => e.id === 1)!.mine).toBe(true);
            expect(list.find(e => e.id === 2)!.mine).toBe(false);
            expect(list[0].publicCopies).toBe(1);
        });
    });

    it('getSingleEditions returns the DTO', async () => {
        comm.get.mockResolvedValue({ data: { primary: editionDto(), others: [] } });
        const res = await svc.getSingleEditions(1);
        expect(res.primary.id).toBe(1);
        expect(comm.get).toHaveBeenCalledWith('v1/editions/1');
    });

    it('getManuscriptEditions', async () => {
        comm.get.mockResolvedValue({ data: { editions: [] } });
        await svc.getManuscriptEditions(10);
        expect(comm.get).toHaveBeenCalledWith('v1/manuscripts/10/editions');
    });

    it('getEditionMetadata', async () => {
        comm.get.mockResolvedValue({ data: { editionId: 1 } });
        const res = await svc.getEditionMetadata(1);
        expect((res as any).editionId).toBe(1);
        expect(comm.get).toHaveBeenCalledWith('v1/editions/1/metadata');
    });

    describe('copyEdition', () => {
        it('throws when the source edition is missing', async () => {
            await expect(svc.copyEdition(999, 'x')).rejects.toThrow(/non existing/);
        });

        it('creates the clone, links versions and adds it to the store', async () => {
            const prev = new EditionInfo(editionDto({ id: 1 }));
            st.editions.items = [prev];
            comm.post.mockResolvedValue({ data: editionDto({ id: 2, name: 'copy' }) });
            const clone = await svc.copyEdition(1, 'copy');
            expect(clone.mine).toBe(true);
            expect(clone.otherVersions.some(v => v.id === 1)).toBe(true);
            expect(prev.otherVersions.some(v => v.id === 2)).toBe(true);
            expect(st.editions.find(2)).toBeTruthy();
            expect(comm.post).toHaveBeenCalledWith('v1/editions/1', { name: 'copy' });
        });
    });

    describe('renameEdition', () => {
        it('throws when missing', async () => {
            await expect(svc.renameEdition(999, 'x')).rejects.toThrow(/non-existing/);
        });
        it('updates name + lastEdit', async () => {
            st.editions.items = [new EditionInfo(editionDto({ id: 1 }))];
            comm.put.mockResolvedValue({
                data: editionDto({ id: 1, name: 'new', lastEdit: '2021-05-05T00:00:00' }),
            });
            const ed = await svc.renameEdition(1, 'new');
            expect(ed.name).toBe('new');
            expect(ed.lastEdit).toEqual(new Date('2021-05-05T00:00:00'));
        });
    });

    describe('deleteEdition', () => {
        it('non-admin path issues a single DELETE', async () => {
            comm.delete.mockResolvedValue({ data: 'ok' });
            const res = await svc.deleteEdition(1);
            expect(res).toBe('ok');
            expect(comm.delete).toHaveBeenCalledTimes(1);
            expect(comm.delete).toHaveBeenCalledWith('v1/editions/1');
        });

        it('admin path issues two DELETEs with the returned token', async () => {
            comm.delete
                .mockResolvedValueOnce({ data: { token: 'T1' } })
                .mockResolvedValueOnce({ data: 'done' });
            const res = await svc.deleteEdition(1, true);
            expect(res).toBe('done');
            expect(comm.delete).toHaveBeenCalledTimes(2);
            expect(comm.delete).toHaveBeenNthCalledWith(
                1,
                'v1/editions/1?optional=archiveForAllEditors'
            );
            expect(comm.delete).toHaveBeenNthCalledWith(
                2,
                'v1/editions/1?optional=archiveForAllEditors&token=T1'
            );
        });
    });

    describe('inviteEditor', () => {
        it('throws when edition missing', async () => {
            await expect(svc.inviteEditor(999, 'a@b.com', 'read')).rejects.toThrow();
        });

        it('adds a new invitation row', async () => {
            const ed = new EditionInfo(editionDto({ id: 1 }));
            ed.invitations = [];
            st.editions.items = [ed];
            comm.post.mockResolvedValue({ data: {} });
            await svc.inviteEditor(1, 'x@y.com', 'write');
            expect(comm.post).toHaveBeenCalledWith(
                'v1/editions/1/add-editor-request',
                expect.objectContaining({ email: 'x@y.com', mayWrite: true })
            );
            expect(ed.invitations.some(i => i.email === 'x@y.com')).toBe(true);
        });

        it('updates an existing invitation and removes it on none', async () => {
            const ed = new EditionInfo(editionDto({ id: 1 }));
            const { ShareInfo, Permissions } = await import('@/models/edition');
            ed.invitations = [
                new ShareInfo(
                    'x@y.com',
                    new Permissions({ mayRead: true, mayWrite: false, isAdmin: false })
                ),
            ];
            st.editions.items = [ed];
            comm.post.mockResolvedValue({ data: {} });
            await svc.inviteEditor(1, 'x@y.com', 'none');
            expect(ed.invitations.length).toBe(0);
        });
    });

    it('updateInvitation delegates to inviteEditor', async () => {
        const ed = new EditionInfo(editionDto({ id: 1 }));
        ed.invitations = [];
        st.editions.items = [ed];
        comm.post.mockResolvedValue({ data: {} });
        await svc.updateInvitation(1, 'z@z.com', 'read');
        expect(comm.post).toHaveBeenCalled();
    });

    it('confirmAddEditionEditor posts null to the confirm url', async () => {
        comm.post.mockResolvedValue({ data: {} });
        await svc.confirmAddEditionEditor('mytoken');
        expect(comm.post).toHaveBeenCalledWith(
            'v1/editions/confirm-editorship/mytoken',
            null
        );
    });

    describe('updateSharePermissions', () => {
        it('throws when edition missing', async () => {
            await expect(
                svc.updateSharePermissions(999, 'a@b.com', 'read')
            ).rejects.toThrow(/non-existing/);
        });

        it('throws when the share is missing', async () => {
            const ed = new EditionInfo(editionDto({ id: 1 }));
            ed.shares = [];
            st.editions.items = [ed];
            await expect(
                svc.updateSharePermissions(1, 'nobody@x.com', 'read')
            ).rejects.toThrow(/Can't find share/);
        });

        it('updates the share permissions', async () => {
            const ed = new EditionInfo(editionDto({ id: 1 }));
            const { ShareInfo, Permissions } = await import('@/models/edition');
            ed.shares = [
                new ShareInfo(
                    'p@q.com',
                    new Permissions({ mayRead: true, mayWrite: false, isAdmin: false })
                ),
            ];
            st.editions.items = [ed];
            comm.put.mockResolvedValue({
                data: { mayRead: true, mayWrite: true, isAdmin: false },
            });
            await svc.updateSharePermissions(1, 'p@q.com', 'write');
            expect(ed.shares[0].permissions.mayWrite).toBe(true);
            expect(comm.put).toHaveBeenCalledWith(
                'v1/editions/1/editors/p@q.com',
                expect.objectContaining({ mayWrite: true })
            );
        });
    });

    it('getAllInvitations', async () => {
        comm.get.mockResolvedValue({ data: { editorInvitations: [] } });
        const res = await svc.getAllInvitations();
        expect((res as any).editorInvitations).toEqual([]);
        expect(comm.get).toHaveBeenCalledWith('v1/editions/admin-share-requests');
    });

    describe('updateArtefactDTOs', () => {
        it('throws when edition missing', async () => {
            await expect(svc.updateArtefactDTOs(999, [])).rejects.toThrow();
        });
        it('posts a batch placement dto and touches the edition', async () => {
            const ed = new EditionInfo(editionDto({ id: 1 }));
            st.editions.items = [ed];
            const touch = vi.spyOn(st, 'touchEdition');
            comm.post.mockResolvedValue({ data: { artefactPlacements: [] } });
            const arts = [
                { id: 5, placement: { scale: 1 }, isPlaced: true } as any,
            ];
            await svc.updateArtefactDTOs(1, arts);
            expect(comm.post).toHaveBeenCalledWith(
                '/v1/editions/1/artefacts/batch-transformation',
                { artefactPlacements: [{ artefactId: 5, placement: { scale: 1 }, isPlaced: true }] }
            );
            expect(touch).toHaveBeenCalledWith(1);
        });
    });

    describe('artefact groups', () => {
        it('newArtefactGroup posts and touches', async () => {
            const touch = vi.spyOn(st, 'touchEdition');
            comm.post.mockResolvedValue({ data: { id: 3 } });
            const grp = ArtefactGroup.generateGroup([1, 2], true);
            await svc.newArtefactGroup(1, grp);
            expect(comm.post).toHaveBeenCalledWith(
                '/v1/editions/1/artefact-groups',
                expect.objectContaining({ artefacts: [1, 2] })
            );
            expect(touch).toHaveBeenCalledWith(1);
        });

        it('updateArtefactGroup puts to the group url', async () => {
            comm.put.mockResolvedValue({ data: { id: 3 } });
            const grp = ArtefactGroup.generateGroup([1], true);
            await svc.updateArtefactGroup(1, grp);
            expect(comm.put).toHaveBeenCalledWith(
                `/v1/editions/1/artefact-groups/${grp.groupId}`,
                expect.objectContaining({ artefacts: [1] })
            );
        });

        it('deleteArtefactGroup deletes the group url', async () => {
            comm.delete.mockResolvedValue({ data: {} });
            await svc.deleteArtefactGroup(1, 7);
            expect(comm.delete).toHaveBeenCalledWith('/v1/editions/1/artefact-groups/7');
        });

        it('getArtefactGroups maps dtos to models', async () => {
            comm.get.mockResolvedValue({
                data: { artefactGroups: [{ id: 3, name: 'g', artefacts: [1, 2] }] },
            });
            const groups = await svc.getArtefactGroups(1);
            expect(groups.length).toBe(1);
            expect(groups[0].artefactIds).toEqual([1, 2]);
        });
    });

    describe('updateMetrics', () => {
        it('throws when edition missing', async () => {
            await expect(svc.updateMetrics(999, {} as any)).rejects.toThrow();
        });
        it('puts metrics and updates the edition', async () => {
            const ed = new EditionInfo(editionDto({ id: 1 }));
            st.editions.items = [ed];
            comm.put.mockResolvedValue({
                data: editionDto({
                    id: 1,
                    metrics: { width: 5, height: 6, xOrigin: 0, yOrigin: 0 } as any,
                    lastEdit: '2022-02-02T00:00:00',
                }),
            });
            const res = await svc.updateMetrics(1, { width: 5, height: 6 } as any);
            expect(res.metrics.width).toBe(5);
        });
    });

    it('getAllAttributeMetadata', async () => {
        comm.get.mockResolvedValue({ data: { attributes: [] } });
        const res = await svc.getAllAttributeMetadata(1);
        expect(res.attributes).toEqual([]);
        expect(comm.get).toHaveBeenCalledWith(
            '/v1/editions/1/sign-interpretations-attributes'
        );
    });

    it('getScribalFont', async () => {
        comm.get.mockResolvedValue({ data: { scripts: [] } });
        const res = await svc.getScribalFont(1);
        expect(res.scripts).toEqual([]);
        expect(comm.get).toHaveBeenCalledWith('v1/editions/1/scribalfonts');
    });
});
