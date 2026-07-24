import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StateManager } from '@/state';
import { Artefact } from '@/models/artefact';
import type { ArtefactDTO } from '@/dtos/sqe-dtos';

vi.mock('@/services/comm-helper', () => ({
    CommHelper: {
        get: vi.fn(),
        put: vi.fn(),
        post: vi.fn(),
        delete: vi.fn(),
    },
}));

import { CommHelper } from '@/services/comm-helper';
import ArtefactService from '@/services/artefact';

const comm = CommHelper as unknown as {
    get: ReturnType<typeof vi.fn>;
    put: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
};

function artefactDto(over: Partial<ArtefactDTO> = {}): ArtefactDTO {
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
        placement: {
            scale: 1,
            rotate: 0,
            translate: { x: 0, y: 0 },
            zIndex: 0,
            mirrored: false,
        },
        artefactPlacementEditorId: 1,
        side: 'recto',
        statusMessage: '',
        ...over,
    } as ArtefactDTO;
}

const st = StateManager.instance;

describe('ArtefactService', () => {
    let svc: ArtefactService;
    beforeEach(() => {
        vi.clearAllMocks();
        st.artefacts.items = [];
        st.editions.items = [];
        st.imagedObjects.items = [];
        svc = new ArtefactService();
    });

    describe('getEditionArtefacts', () => {
        it('maps artefacts without an image stack when url/manifest absent', async () => {
            comm.get.mockResolvedValue({
                data: { artefacts: [{ ...artefactDto({ id: 1 }), ppi: 300 }] },
            });
            const res = await svc.getEditionArtefacts(100);
            expect(res.length).toBe(1);
            expect(res[0].imageStack).toBeUndefined();
            expect(comm.get).toHaveBeenCalledWith(
                '/v1/editions/100/artefacts?optional=images'
            );
        });

        it('leaves a virtual artefact (no imagedObjectId) mask-image-free', async () => {
            const ed = { id: 100 } as any;
            st.editions.items = [ed];
            comm.get.mockResolvedValue({
                data: {
                    artefacts: [
                        {
                            ...artefactDto({ id: 2, imagedObjectId: '' }),
                            ppi: 300,
                            url: 'http://img',
                            imageManifest: '{}',
                        },
                    ],
                },
            });
            const res = await svc.getEditionArtefacts(100);
            expect(res[0].isVirtual).toBe(true);
            expect(res[0].imageStack).toBeUndefined();
        });
    });

    it('getArtefactMask returns the mask WKT', async () => {
        comm.get.mockResolvedValue({ data: { mask: 'POLYGON((1 1,2 2,3 3,1 1))' } });
        const mask = await svc.getArtefactMask(100, 5);
        expect(mask).toBe('POLYGON((1 1,2 2,3 3,1 1))');
        expect(comm.get).toHaveBeenCalledWith('v1/editions/100/artefacts/5?optional=masks');
    });

    it('getArtefactMask returns empty string when mask missing', async () => {
        comm.get.mockResolvedValue({ data: {} });
        expect(await svc.getArtefactMask(100, 5)).toBe('');
    });

    it('getEditionArtefactMasks returns raw dto list', async () => {
        comm.get.mockResolvedValue({ data: { artefacts: [artefactDto()] } });
        const res = await svc.getEditionArtefactMasks(100);
        expect(res.length).toBe(1);
        expect(comm.get).toHaveBeenCalledWith('/v1/editions/100/artefacts?optional=masks');
    });

    describe('createArtefact', () => {
        const master = { id: 42, master: true };
        const io = {
            id: 'IO-1',
            recto: { images: [master, { id: 43, master: false }] },
            verso: undefined,
        } as any;

        it('throws when the requested side is missing', async () => {
            await expect(
                svc.createArtefact(100, io, 'a', 'verso')
            ).rejects.toThrow(/does not have the verso side/);
        });

        it('throws when the side has no master image', async () => {
            const noMaster = { id: 'IO-2', recto: { images: [{ id: 1, master: false }] } } as any;
            await expect(
                svc.createArtefact(100, noMaster, 'a', 'recto')
            ).rejects.toThrow(/no master image/);
        });

        it('posts a create dto and adds the artefact to the store', async () => {
            const touch = vi.spyOn(st, 'touchEdition');
            comm.post.mockResolvedValue({ data: artefactDto({ id: 7, name: 'a' }) });
            const art = await svc.createArtefact(100, io, 'a', 'recto');
            expect(art.id).toBe(7);
            expect(st.artefacts.find(7)).toBeTruthy();
            expect(touch).toHaveBeenCalledWith(100);
            expect(comm.post).toHaveBeenCalledWith(
                '/v1/editions/100/artefacts',
                expect.objectContaining({ masterImageId: 42, name: 'a' })
            );
        });
    });

    describe('copyArtefact', () => {
        it('throws when master image not found', async () => {
            const art = new Artefact(artefactDto({ id: 1, imagedObjectId: 'IO-X' }));
            // no imaged object in the store -> master image undefined
            await expect(svc.copyArtefact(100, art)).rejects.toThrow(/no master image/);
        });

        it('posts a copy dto and touches the edition', async () => {
            const art = new Artefact(artefactDto({ id: 1, imagedObjectId: 'IO-1' }));
            const io = {
                id: 'IO-1',
                getImageStack: () => ({ images: [{ id: 99, master: true }] }),
            } as any;
            st.imagedObjects.items = [io];
            const touch = vi.spyOn(st, 'touchEdition');
            comm.post.mockResolvedValue({ data: artefactDto({ id: 8 }) });
            const res = await svc.copyArtefact(100, art);
            expect(res.id).toBe(8);
            expect(touch).toHaveBeenCalledWith(100);
            expect(comm.post).toHaveBeenCalledWith(
                '/v1/editions/100/artefacts',
                expect.objectContaining({ masterImageId: 99 })
            );
        });
    });

    it('deleteArtefact deletes and touches', async () => {
        const art = new Artefact(artefactDto({ id: 3, editionId: 100 }));
        const touch = vi.spyOn(st, 'touchEdition');
        comm.delete.mockResolvedValue({ data: {} });
        await svc.deleteArtefact(art);
        expect(comm.delete).toHaveBeenCalledWith('v1/editions/100/artefacts/3');
        expect(touch).toHaveBeenCalledWith(100);
    });

    describe('changeArtefact', () => {
        it('puts with an X-Operation-Id and applies the response', async () => {
            const art = new Artefact(artefactDto({ id: 4, editionId: 100 }));
            st.artefacts.add(art);
            const touch = vi.spyOn(st, 'touchEdition');
            comm.put.mockResolvedValue({ data: artefactDto({ id: 4, name: 'renamed' }) });
            const res = await svc.changeArtefact(100, art);
            expect(res.name).toBe('renamed');
            // put is called with (url, body, true, opId)
            const call = comm.put.mock.calls[0];
            expect(call[0]).toBe('v1/editions/100/artefacts/4');
            expect(call[2]).toBe(true);
            expect(typeof call[3]).toBe('string'); // a uuid opId
            expect(touch).toHaveBeenCalledWith(100);
        });
    });
});
