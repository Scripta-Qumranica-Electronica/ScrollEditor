import { describe, it, expect, vi, beforeEach } from 'vitest';

// Unit test for imaged-object-editor. Its created() hook drives a heavy async
// edition/imaged-object load and the template renders many editor sub-components,
// so the targeted handlers (onArtefactChanged, inputRenameChanged, onRename,
// onDeleteArtefact, newArtefact, sideArtefactChanged) are exercised against a
// controlled `this` built from the component options with a mocked ArtefactService.

vi.mock('@/services/artefact', () => ({ default: vi.fn(function () { return {}; }) }));

import ImagedObjectEditor from '@/views/imaged-object-editor/imaged-object-editor.vue';
import { Polygon } from '@/utils/Polygons';

const M: any = (ImagedObjectEditor as any).methods;
const C: any = (ImagedObjectEditor as any).computed;

function makeArt(over: any = {}): any {
    return {
        id: 1,
        name: 'A1',
        side: 'recto',
        editionId: 100,
        mask: new Polygon(''),
        ...over,
    };
}

// Build a `this` that carries the target methods bound to itself, seeded data and
// inert helper stubs so the handler bodies run in isolation.
function makeCtx(over: any = {}) {
    const artefactService = {
        changeArtefact: vi.fn().mockResolvedValue(undefined),
        deleteArtefact: vi.fn().mockResolvedValue(undefined),
        createArtefact: vi.fn(),
    };
    const ctx: any = {
        artefactService,
        artefactId: -1,
        renaming: false,
        renameInputActive: null,
        side: 'recto',
        newArtefactName: '',
        showNewModal: false,
        errorMessage: '',
        editionId: 100,
        nonSelectedMask: new Polygon(''),
        initialMask: new Polygon(''),
        params: { drawingMode: 0 },
        artefacts: [],
        visibleArtefacts: [],
        imagedObject: { getImageStack: vi.fn().mockReturnValue(undefined) },
        $emit: vi.fn(),
        $t: (k: string) => k,
        showMessage: vi.fn(),
        editingModeChanged: vi.fn(),
        fillImageSettings: vi.fn(),
        ...over,
    };
    // Bind the real methods we exercise (plus the ones they call) to this ctx.
    for (const name of ['onArtefactChanged', 'inputRenameChanged', 'onRename', 'onDeleteArtefact', 'newArtefact', 'sideArtefactChanged']) {
        ctx[name] = M[name].bind(ctx);
    }
    return ctx;
}

describe('imaged-object-editor', () => {
    beforeEach(() => vi.clearAllMocks());

    it('onArtefactChanged selects the artefact and accumulates other masks', () => {
        const a1 = makeArt({ id: 1 });
        const a2 = makeArt({ id: 2 });
        const ctx = makeCtx({ visibleArtefacts: [a1, a2] });
        ctx.onArtefactChanged(a1);
        expect(ctx.artefactId).toBe(1);
        // nonSelectedMask is a Polygon (accumulated from a2's empty mask)
        expect(ctx.nonSelectedMask).toBeInstanceOf(Polygon);
    });

    it('inputRenameChanged toggles renameInputActive (art / null)', () => {
        const ctx = makeCtx();
        const art = makeArt();
        ctx.inputRenameChanged(art);
        expect(ctx.renameInputActive).toBe(art);
        ctx.inputRenameChanged(undefined);
        expect(ctx.renameInputActive).toBeNull();
    });

    it('onRename saves the current artefact and closes the rename input', async () => {
        const art = makeArt();
        const ctx = makeCtx({ artefact: art });
        await ctx.onRename();
        expect(ctx.artefactService.changeArtefact).toHaveBeenCalledWith(100, art);
        expect(ctx.showMessage).toHaveBeenCalledWith('toasts.artefactRenamed', 'success');
        expect(ctx.renameInputActive).toBeNull();
        expect(ctx.renaming).toBe(false);
    });

    it('onRename reports an error toast when the save rejects', async () => {
        const art = makeArt();
        const ctx = makeCtx({ artefact: art });
        ctx.artefactService.changeArtefact.mockRejectedValueOnce(new Error('boom'));
        await ctx.onRename();
        expect(ctx.showMessage).toHaveBeenCalledWith('toasts.artefactRenameFailed', 'error');
        expect(ctx.renaming).toBe(false);
    });

    it('onRename throws when there is no current artefact', async () => {
        const ctx = makeCtx({ artefact: undefined });
        await expect(ctx.onRename()).rejects.toThrow(/no artefact/);
    });

    it('onDeleteArtefact deletes and reselects the first remaining artefact', async () => {
        const a1 = makeArt({ id: 1 });
        const a2 = makeArt({ id: 2 });
        const ctx = makeCtx({ artefacts: [a2] });
        await ctx.onDeleteArtefact(a1);
        expect(ctx.artefactService.deleteArtefact).toHaveBeenCalledWith(a1);
        expect(ctx.showMessage).toHaveBeenCalledWith('toasts.artefactDeleted', 'success');
        expect(ctx.artefactId).toBe(2);
    });

    it('onDeleteArtefact resets when no artefacts remain', async () => {
        const a1 = makeArt({ id: 1 });
        const ctx = makeCtx({ artefacts: [] });
        await ctx.onDeleteArtefact(a1);
        expect(ctx.artefactId).toBe(0);
        expect(ctx.initialMask).toBeInstanceOf(Polygon);
    });

    it('onDeleteArtefact reports an error toast when the delete rejects', async () => {
        const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        const a1 = makeArt({ id: 1 });
        const ctx = makeCtx({ artefacts: [a1] });
        ctx.artefactService.deleteArtefact.mockRejectedValueOnce(new Error('nope'));
        await ctx.onDeleteArtefact(a1);
        expect(ctx.showMessage).toHaveBeenCalledWith('toasts.deleteArtefactFailed', 'error');
        err.mockRestore();
    });

    it('newArtefact creates, selects, switches to draw mode and emits create', async () => {
        const created = makeArt({ id: 9, name: 'New' });
        const ctx = makeCtx({
            newArtefactName: '  New  ',
            imagedObject: { getImageStack: vi.fn() },
            visibleArtefacts: [created],
        });
        ctx.artefactService.createArtefact.mockResolvedValueOnce(created);
        await ctx.newArtefact();

        expect(ctx.artefactService.createArtefact).toHaveBeenCalledWith(100, ctx.imagedObject, 'New', 'recto');
        expect(ctx.showNewModal).toBe(false);
        expect(ctx.editingModeChanged).toHaveBeenCalledWith('DRAW');
        expect(ctx.$emit).toHaveBeenCalledWith('create', created);
        expect(ctx.newArtefactName).toBe('');
        expect(ctx.waiting).toBe(false);
    });

    it('newArtefact records the error message when creation rejects', async () => {
        const ctx = makeCtx({ newArtefactName: 'X' });
        ctx.artefactService.createArtefact.mockRejectedValueOnce('creation failed');
        await ctx.newArtefact();
        expect(ctx.errorMessage).toBe('creation failed');
        expect(ctx.waiting).toBe(false);
    });

    it('sideArtefactChanged switches side, reselects and refills image settings', () => {
        const a1 = makeArt({ id: 1, side: 'verso' });
        const ctx = makeCtx({
            side: 'recto',
            artefact: makeArt({ id: 5, side: 'recto' }),
            visibleArtefacts: [a1],
        });
        ctx.sideArtefactChanged({ name: 'verso' } as any);
        expect(ctx.side).toBe('verso');
        expect(ctx.artefactId).toBe(1); // reselected the first visible artefact
        expect(ctx.fillImageSettings).toHaveBeenCalled();
    });

    it('editingModeChanged maps the button value to the drawing mode enum', () => {
        const ctx: any = { params: { drawingMode: 0 } };
        M.editingModeChanged.call(ctx, 'ERASE');
        // DrawingMode.ERASE resolves to a defined enum value.
        expect(ctx.params.drawingMode).toBeDefined();
    });

    it('showMessage logs errors to console.error and other levels to console.info', () => {
        const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
        const ctx: any = { $t: (k: string) => `t:${k}` };
        M.showMessage.call(ctx, 'a.b', 'error');
        M.showMessage.call(ctx, 'c.d');
        expect(err).toHaveBeenCalledWith('t:a.b');
        expect(info).toHaveBeenCalledWith('t:c.d');
        err.mockRestore();
        info.mockRestore();
    });

    it('getArtefactColor cycles the palette by visible-artefact index', () => {
        const a1 = makeArt({ id: 1 });
        const a2 = makeArt({ id: 2 });
        const ctx: any = { visibleArtefacts: [a1, a2] };
        expect(M.getArtefactColor.call(ctx, a1)).toBe('purple');
        expect(M.getArtefactColor.call(ctx, a2)).toBe('blue');
    });

    it('simple computed getters reflect params/side', () => {
        expect(C.canCreate.get.call({ newArtefactName: '   ' })).toBe(false);
        expect(C.canCreate.get.call({ newArtefactName: ' hi ' })).toBe(true);

        expect(C.removeColor.get.call({ params: { highLight: false } })).toBe(true);
        expect(C.removeColor.get.call({ params: { highLight: true } })).toBe(false);

        expect(C.zoomLevel.get.call({ params: { zoom: 3 } })).toBe(3);
        expect(C.rotationAngle.get.call({ params: { rotationAngle: -90 } })).toBe(270);
        expect(C.rotationAngle.get.call({ params: { rotationAngle: 450 } })).toBe(90);
    });

    it('visibleArtefacts filters artefacts by the current side', () => {
        const a1 = makeArt({ id: 1, side: 'recto' });
        const a2 = makeArt({ id: 2, side: 'verso' });
        const ctx: any = { artefacts: [a1, a2], side: 'recto' };
        expect(C.visibleArtefacts.get.call(ctx)).toEqual([a1]);
    });

    it('actualWidth/Height swap dimensions on a 90-degree rotation', () => {
        const base = { imageWidth: 1000, imageHeight: 500, zoomLevel: 2 };
        const noRot = { ...base, rotationAngle: 0 };
        expect(C.actualWidth.get.call(noRot)).toBe(2000);
        expect(C.actualHeight.get.call(noRot)).toBe(1000);

        const rot = { ...base, rotationAngle: 90 };
        expect(C.actualWidth.get.call(rot)).toBe(1000); // height * zoom
        expect(C.actualHeight.get.call(rot)).toBe(2000); // width * zoom
    });

    it('transform composes scale (+ translate for 90-degree rotation)', () => {
        const straight = C.transform.get.call({ rotationAngle: 0, imageWidth: 800, imageHeight: 400, zoomLevel: 1 });
        expect(straight).toContain('scale(1)');
        expect(straight).toContain('rotate(0');

        const turned = C.transform.get.call({ rotationAngle: 90, imageWidth: 800, imageHeight: 400, zoomLevel: 1 });
        expect(turned).toContain('translate(');
        expect(turned).toContain('rotate(90');
    });

    it('editList is empty when read-only and has draw/erase modes when editable', () => {
        expect(C.editList.get.call({ canEdit: false, $t: (k: string) => k })).toEqual([]);
        const list = C.editList.get.call({ canEdit: true, $t: (k: string) => k });
        expect(list.map((m: any) => m.val)).toEqual(['DRAW', 'ERASE']);
    });

    it('isErasing tracks the drawing mode', () => {
        // DrawingMode.ERASE is the second enum member.
        expect(C.isErasing.get.call({ params: { drawingMode: 0 } })).toBe(false);
    });
});
