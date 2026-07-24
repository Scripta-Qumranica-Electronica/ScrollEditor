import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StateManager } from '@/state';
import { EditionInfo } from '@/models/edition';
import type { EditionDTO } from '@/dtos/sqe-dtos';

vi.mock('@/services/comm-helper', () => ({
    CommHelper: {
        get: vi.fn(),
        put: vi.fn(),
        post: vi.fn(),
        delete: vi.fn(),
    },
}));

import { CommHelper } from '@/services/comm-helper';
import ImagedObjectService from '@/services/imaged-object';

const comm = CommHelper as unknown as { get: ReturnType<typeof vi.fn> };

function editionDto(id = 1): EditionDTO {
    return {
        id,
        name: 'Edition',
        manuscriptId: 10,
        editionDataEditorId: 1,
        permission: { mayRead: true, mayWrite: true, isAdmin: true },
        owner: { userId: 1, email: 'a@b.com' },
        shares: [],
        metrics: { width: 100, height: 100, xOrigin: 0, yOrigin: 0 } as any,
        locked: false,
        isPublic: false,
        copyright: '',
    } as EditionDTO;
}

const st = StateManager.instance;

describe('ImagedObjectService', () => {
    let svc: ImagedObjectService;
    beforeEach(() => {
        vi.clearAllMocks();
        st.editions.items = [];
        svc = new ImagedObjectService();
    });

    it('throws when the edition does not exist', async () => {
        await expect(svc.getEditionImagedObjects(999)).rejects.toThrow(
            /non existing edition/
        );
    });

    it('maps imaged-object dtos to models', async () => {
        st.editions.items = [new EditionInfo(editionDto(1))];
        (comm.get as any).mockResolvedValue({
            data: {
                imagedObjects: [
                    { id: 'IO-1', recto: undefined, verso: undefined },
                    { id: 'IO-2', recto: undefined, verso: undefined },
                ],
            },
        });
        const res = await svc.getEditionImagedObjects(1);
        expect(res.map(io => io.id)).toEqual(['IO-1', 'IO-2']);
        expect(comm.get).toHaveBeenCalledWith('v1/editions/1/imaged-objects');
    });
});
