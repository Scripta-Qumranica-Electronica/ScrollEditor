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
import { InterpretationRoi } from '@/models/text';

// Builds a plain InterpretationRoi (status 'original') from a minimal DTO.
function makeRoi(over: any = {}): InterpretationRoi {
    return new InterpretationRoi({
        artefactId: 5,
        signInterpretationId: undefined,
        shape: '',
        translate: { x: 0, y: 0 },
        stanceRotation: 0,
        exceptional: false,
        valuesSet: true,
        ...over,
    } as any);
}

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

        it('reconciles created ROIs and maps frontend id to server id', async () => {
            const newRoi = makeRoi();
            newRoi.status = 'new';
            const artefact = {
                id: 5,
                editionId: 100,
                rois: [newRoi],
                deleteRois: [],
            } as any;

            // Server echoes the ROI back with a real interpretationRoiId.
            comm.post.mockResolvedValue({
                data: {
                    createRois: [
                        {
                            interpretationRoiId: 9001,
                            artefactId: 5,
                            signInterpretationId: undefined,
                            shape: '',
                            translate: { x: 0, y: 0 },
                            stanceRotation: 0,
                            exceptional: false,
                            valuesSet: true,
                        },
                    ],
                },
            });

            const mapSpy = vi.spyOn(
                st.interpretationRois,
                'mapFrontendIdToServerId'
            );
            const putSpy = vi.spyOn(st.interpretationRois, 'put');

            const count = await svc.updateArtefactROIs(artefact, 'created');

            expect(count).toBe(1);
            // The post carried the new ROI in createRois.
            const body = comm.post.mock.calls[0][1];
            expect(body.createRois.length).toBe(1);
            expect(body.deleteRois).toEqual([]);
            // Post-save ROI stored under the server id and remapped from the frontend id.
            expect(putSpy).toHaveBeenCalled();
            expect(mapSpy).toHaveBeenCalledWith(newRoi.id, 9001);
            expect(artefact.deleteRois).toEqual([]);
            expect(touch).toHaveBeenCalledWith(100);
        });

        it('detaches the pre-save ROI and attaches the post-save ROI to its sign-interpretation', async () => {
            const newRoi = makeRoi({ signInterpretationId: 700 });
            newRoi.status = 'new';
            const artefact = {
                id: 5,
                editionId: 100,
                rois: [newRoi],
                deleteRois: [],
            } as any;

            comm.post.mockResolvedValue({
                data: {
                    createRois: [
                        {
                            interpretationRoiId: 9002,
                            artefactId: 5,
                            signInterpretationId: 700,
                            shape: '',
                            translate: { x: 0, y: 0 },
                            stanceRotation: 0,
                            exceptional: false,
                            valuesSet: true,
                        },
                    ],
                },
            });

            // Stub the sign-interpretation lookup so both the pre-save delete
            // branch and the post-save push branch are exercised.
            const si = { rois: [] as any[], deleteRoi: vi.fn() };
            const getSpy = vi
                .spyOn(st.signInterpretations, 'get')
                .mockReturnValue(si as any);

            const count = await svc.updateArtefactROIs(artefact, 'created');

            expect(count).toBe(1);
            expect(getSpy).toHaveBeenCalledWith(700);
            expect(si.deleteRoi).toHaveBeenCalledWith(newRoi);
            // The freshly-built post-save ROI was attached to the sign-interpretation.
            expect(si.rois.length).toBe(1);
            expect((si.rois[0] as any).id).toBe(9002);
            getSpy.mockRestore();
        });

        it('logs an error when the post-save ROI sign-interpretation is missing', async () => {
            const newRoi = makeRoi({ signInterpretationId: 800 });
            newRoi.status = 'new';
            const artefact = {
                id: 5,
                editionId: 100,
                rois: [newRoi],
                deleteRois: [],
            } as any;

            comm.post.mockResolvedValue({
                data: {
                    createRois: [
                        {
                            interpretationRoiId: 9003,
                            artefactId: 5,
                            signInterpretationId: 800,
                            shape: '',
                            translate: { x: 0, y: 0 },
                            stanceRotation: 0,
                            exceptional: false,
                            valuesSet: true,
                        },
                    ],
                },
            });

            // No sign-interpretation in state -> post-save lookup fails.
            const getSpy = vi
                .spyOn(st.signInterpretations, 'get')
                .mockReturnValue(undefined);
            const errSpy = vi
                .spyOn(console, 'error')
                .mockImplementation(() => undefined);

            const count = await svc.updateArtefactROIs(artefact, 'created');

            expect(count).toBe(1);
            expect(errSpy).toHaveBeenCalled();
            getSpy.mockRestore();
            errSpy.mockRestore();
        });

        it('logs an error and skips reconciliation when server list length mismatches', async () => {
            const newRoi = makeRoi();
            newRoi.status = 'new';
            const artefact = {
                id: 5,
                editionId: 100,
                rois: [newRoi],
                deleteRois: [],
            } as any;

            // Server returns an empty list although one ROI was created.
            comm.post.mockResolvedValue({ data: { createRois: [] } });
            const errSpy = vi
                .spyOn(console, 'error')
                .mockImplementation(() => undefined);
            const mapSpy = vi.spyOn(
                st.interpretationRois,
                'mapFrontendIdToServerId'
            );

            const count = await svc.updateArtefactROIs(artefact, 'created');

            expect(count).toBe(1);
            expect(errSpy).toHaveBeenCalled();
            // Bailed out before any remapping.
            expect(mapSpy).not.toHaveBeenCalled();
            errSpy.mockRestore();
        });

        it('removes deleted ROIs from state', async () => {
            const delRoi = makeRoi({ interpretationRoiId: 4242 });
            delRoi.status = 'deleted';
            const artefact = {
                id: 5,
                editionId: 100,
                rois: [delRoi],
                deleteRois: [],
            } as any;

            comm.post.mockResolvedValue({ data: { createRois: [] } });
            const delSpy = vi.spyOn(st.interpretationRois, 'delete');

            const count = await svc.updateArtefactROIs(artefact, 'deleted');

            expect(count).toBe(1);
            // The deleted ROI id was sent to the server and removed from state.
            const body = comm.post.mock.calls[0][1];
            expect(body.deleteRois).toEqual([4242]);
            expect(delSpy).toHaveBeenCalledWith(4242);
            expect(artefact.deleteRois).toEqual([]);
            expect(touch).toHaveBeenCalledWith(100);
        });
    });
});
