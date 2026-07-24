import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StateManager } from '@/state';

vi.mock('@/services/comm-helper', () => ({
    CommHelper: {
        get: vi.fn(),
        put: vi.fn(),
        post: vi.fn(),
        delete: vi.fn(),
    },
}));

import { CommHelper } from '@/services/comm-helper';
import TextService from '@/services/text';

const comm = CommHelper as unknown as {
    get: ReturnType<typeof vi.fn>;
    put: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
};

const st = StateManager.instance;

function textEditionDto(over: any = {}) {
    return {
        manuscriptId: 1,
        editionId: 100,
        editorId: 1,
        licence: '',
        textFragments: [],
        ...over,
    };
}

describe('TextService', () => {
    let svc: TextService;
    let touch: any;
    beforeEach(() => {
        vi.clearAllMocks();
        svc = new TextService();
        touch = vi.spyOn(st, 'touchEdition');
    });

    it('getEditionTextFragments maps to TextFragmentData', async () => {
        comm.get.mockResolvedValue({
            data: {
                textFragments: [
                    { id: 1, name: 'frag', editorId: 1 },
                ],
            },
        });
        const res = await svc.getEditionTextFragments(100);
        expect(res.length).toBe(1);
        expect(comm.get).toHaveBeenCalledWith('/v1/editions/100/text-fragments');
    });

    it('getArtefactTextFragments maps to ArtefactTextFragmentData (suggested)', async () => {
        comm.get.mockResolvedValue({
            data: { textFragments: [{ id: 1, name: 'frag', editorId: 1, suggested: true }] },
        });
        const res = await svc.getArtefactTextFragments(100, 2);
        expect(res.length).toBe(1);
        expect(comm.get).toHaveBeenCalledWith(
            'v1/editions/100/artefacts/2/text-fragments?optional=suggested'
        );
    });

    it('getTextFragment builds a TextEdition', async () => {
        comm.get.mockResolvedValue({ data: textEditionDto() });
        const res = await svc.getTextFragment(100, 9);
        expect(res).toBeTruthy();
        expect(comm.get).toHaveBeenCalledWith('/v1/editions/100/text-fragments/9');
    });

    it('getEditionFullText builds a TextEdition', async () => {
        comm.get.mockResolvedValue({ data: textEditionDto() });
        const res = await svc.getEditionFullText(100);
        expect(res).toBeTruthy();
        expect(comm.get).toHaveBeenCalledWith('v1/editions/100/full-text');
    });

    it('changeTextFragment puts the name and touches the edition', async () => {
        comm.put.mockResolvedValue({
            data: { textFragmentId: 9, textFragmentName: 'renamed', editorId: 1, lines: [] },
        });
        const fragment = { id: 9, textFragmentName: 'renamed' } as any;
        const res = await svc.changeTextFragment(100, fragment);
        expect(res.textFragmentName).toBe('renamed');
        expect(comm.put).toHaveBeenCalledWith('/v1/editions/100/text-fragments/9', {
            name: 'renamed',
        });
        expect(touch).toHaveBeenCalledWith(100);
    });

    it('getLineText returns the dto', async () => {
        comm.get.mockResolvedValue({ data: { lineId: 3 } });
        const res = await svc.getLineText(100, 3);
        expect(res.lineId).toBe(3);
        expect(comm.get).toHaveBeenCalledWith('v1/editions/100/lines/3');
    });

    it('replaceText puts the diff-replace dto and touches', async () => {
        comm.put.mockResolvedValue({ data: { editionId: 100 } });
        const res = await svc.replaceText(100, 1, 2, 'text');
        expect((res as any).editionId).toBe(100);
        expect(comm.put).toHaveBeenCalledWith('v1/editions/100/diff-replace-text', {
            priorSignInterpretationId: 1,
            followingSignInterpretationId: 2,
            newText: 'text',
        });
        expect(touch).toHaveBeenCalledWith(100);
    });

    it('createLine posts the create-line dto', async () => {
        comm.post.mockResolvedValue({ data: { lineId: 4 } });
        const res = await svc.createLine(100, 9, { lineName: 'L1' } as any, 1, 2);
        expect(res.lineId).toBe(4);
        expect(comm.post).toHaveBeenCalledWith(
            '/v1/editions/100/text-fragments/9/lines',
            { previousLineId: 1, subsequentLineId: 2, lineName: 'L1' }
        );
        expect(touch).toHaveBeenCalledWith(100);
    });

    it('deleteLine deletes and touches', async () => {
        comm.delete.mockResolvedValue({ data: {} });
        await svc.deleteLine(100, 4);
        expect(comm.delete).toHaveBeenCalledWith('/v1/editions/100/lines/4');
        expect(touch).toHaveBeenCalledWith(100);
    });

    describe('updateArtefactROIs', () => {
        it('posts an empty batch when there are no ROIs to change', async () => {
            const artefact = {
                id: 5,
                editionId: 100,
                rois: [],
                deleteRois: [],
            } as any;
            comm.post.mockResolvedValue({ data: { createRois: [] } });
            const count = await svc.updateArtefactROIs(artefact);
            expect(count).toBe(0);
            expect(comm.post).toHaveBeenCalledWith('/v1/editions/100/rois/batch-edit', {
                createRois: [],
                updateRois: [],
                deleteRois: [],
            });
            expect(artefact.deleteRois).toEqual([]);
        });
    });
});
