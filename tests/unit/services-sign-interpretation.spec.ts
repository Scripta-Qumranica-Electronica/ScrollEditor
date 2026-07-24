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
import SignInterpretationService from '@/services/sign-interpretation';

const comm = CommHelper as unknown as {
    get: ReturnType<typeof vi.fn>;
    put: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
};

const st = StateManager.instance;
const edition = { id: 100 } as any;

function makeSi(over: any = {}) {
    return {
        id: 5,
        signInterpretationId: 5,
        character: 'א',
        commentary: 'a comment',
        signType: [1, 'LETTER'],
        attributes: [],
        ...over,
    };
}

describe('SignInterpretationService', () => {
    let svc: SignInterpretationService;
    let touch: any;
    beforeEach(() => {
        vi.clearAllMocks();
        svc = new SignInterpretationService();
        touch = vi.spyOn(st, 'touchEdition');
    });

    it('updateAttribute puts the attribute create dto', async () => {
        comm.put.mockResolvedValue({ data: { signInterpretationId: 5 } });
        const attribute = {
            attributeId: 3,
            attributeValueId: 7,
            commentary: { commentary: 'hi' },
        } as any;
        const res = await svc.updateAttribute(edition, makeSi() as any, 2, attribute);
        expect((res as any).data.signInterpretationId).toBe(5);
        expect(comm.put).toHaveBeenCalledWith(
            '/v1/editions/100/sign-interpretations/5/attributes/2',
            { attributeId: 3, attributeValueId: 7, commentary: 'hi' }
        );
        expect(touch).toHaveBeenCalledWith(100);
    });

    it('deleteAttribute deletes the attribute-value url', async () => {
        comm.delete.mockResolvedValue({ data: {} });
        await svc.deleteAttribute(edition, makeSi() as any, 9);
        expect(comm.delete).toHaveBeenCalledWith(
            '/v1/editions/100/sign-interpretations/5/attributes/9'
        );
        expect(touch).toHaveBeenCalledWith(100);
    });

    it('createAttribute posts to the attributes url (no value id)', async () => {
        comm.post.mockResolvedValue({ data: { signInterpretationId: 5 } });
        const attribute = { attributeId: 3, attributeValueId: 7 } as any;
        const res = await svc.createAttribute(edition, makeSi() as any, attribute);
        expect(res.signInterpretationId).toBe(5);
        expect(comm.post).toHaveBeenCalledWith(
            '/v1/editions/100/sign-interpretations/5/attributes',
            { attributeId: 3, attributeValueId: 7, commentary: undefined }
        );
    });

    it('updateCommentary puts the commentary dto', async () => {
        comm.put.mockResolvedValue({ data: { signInterpretationId: 5 } });
        const res = await svc.updateCommentary(edition, makeSi({ commentary: 'note' }) as any);
        expect(res.signInterpretationId).toBe(5);
        expect(comm.put).toHaveBeenCalledWith(
            'v1/editions/100/sign-interpretations/5/commentary',
            { commentary: 'note' }
        );
    });

    it('updateCommentary sends undefined when commentary empty', async () => {
        comm.put.mockResolvedValue({ data: {} });
        await svc.updateCommentary(edition, makeSi({ commentary: null }) as any);
        expect(comm.put).toHaveBeenCalledWith(
            'v1/editions/100/sign-interpretations/5/commentary',
            { commentary: undefined }
        );
    });

    describe('deleteSignInterpretation', () => {
        it('appends delete-all-variants by default and reassigns a negative id', async () => {
            comm.delete.mockResolvedValue({ data: {} });
            const si = makeSi();
            await svc.deleteSignInterpretation(edition, si as any);
            expect(comm.delete).toHaveBeenCalledWith(
                'v1/editions/100/sign-interpretations/5?optional=delete-all-variants'
            );
            expect(si.signInterpretationId).toBeLessThan(0);
        });

        it('omits delete-all-variants when disabled', async () => {
            comm.delete.mockResolvedValue({ data: {} });
            await svc.deleteSignInterpretation(edition, makeSi() as any, false);
            expect(comm.delete).toHaveBeenCalledWith(
                'v1/editions/100/sign-interpretations/5'
            );
        });
    });

    it('updateSignInterpretation puts the character update dto', async () => {
        comm.put.mockResolvedValue({ data: {} });
        const si = makeSi({ character: 'ב', signType: [2, 'SPACE'] });
        await svc.updateSignInterpretation(edition, si as any);
        expect(comm.put).toHaveBeenCalledWith(
            'v1/editions/100/sign-interpretations/5',
            { character: 'ב', attributeValueId: 2, priority: 1 }
        );
        expect(touch).toHaveBeenCalledWith(100);
    });

    describe('createSignInterpretation', () => {
        function buildSiForCreate() {
            const prevSi = { id: 42 };
            const prevSign = { signInterpretations: [prevSi] };
            const line = { signs: [prevSign, null] };
            const sign = { line, indexInLine: 1 };
            return {
                id: -3,
                signInterpretationId: -3,
                character: 'א',
                commentary: null,
                attributes: [{ attributeId: 1, attributeValueId: 2, commentary: 'c' }],
                sign,
            } as any;
        }

        it('posts the create dto and maps the frontend id to the server id', async () => {
            const si = buildSiForCreate();
            comm.post.mockResolvedValue({
                data: { created: [{ signInterpretationId: 500 }] },
            });
            const mapSpy = vi.spyOn(
                st.signInterpretations,
                'mapFrontendIdToServerId'
            );
            vi.spyOn(st.signInterpretations, 'get').mockReturnValue(undefined);
            await svc.createSignInterpretation(edition, si);
            expect(comm.post).toHaveBeenCalledWith(
                'v1/editions/100/sign-interpretations',
                expect.objectContaining({
                    character: 'א',
                    previousSignInterpretationIds: [42],
                })
            );
            expect(si.signInterpretationId).toBe(500);
            expect(mapSpy).toHaveBeenCalledWith(-3, 500);
        });

        it('flags corruption when the server does not return exactly one sign', async () => {
            const si = buildSiForCreate();
            comm.post.mockResolvedValue({ data: { created: [] } });
            const corrupt = vi
                .spyOn(st, 'corrupted')
                .mockImplementation((() => undefined) as any);
            vi.spyOn(st.signInterpretations, 'get').mockReturnValue(undefined);
            vi.spyOn(st.signInterpretations, 'mapFrontendIdToServerId').mockImplementation(
                () => undefined
            );
            // created is empty -> created![0] throws; guard by supplying a created entry
            comm.post.mockResolvedValue({
                data: { created: [{ signInterpretationId: 501 }, { signInterpretationId: 502 }] },
            });
            await svc.createSignInterpretation(edition, si);
            expect(corrupt).toHaveBeenCalled();
        });
    });
});
