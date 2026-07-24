import { describe, it, expect, vi } from 'vitest';
import ImagedObjectEditorToolbar from '@/views/imaged-object-editor/imaged-object-editor-toolbar.vue';
import { ImagedObjectEditorParams, DrawingMode } from '@/views/imaged-object-editor/types';

// Unit test for the imaged-object-editor toolbar's behaviour.
//
// NOTE: this component's template renders a `<slot />` (inside <toolbar>). Under
// this project's `@vue/compat` (MODE 2) + `vue-facing-decorator` setup, mounting
// a component whose template contains a bare `<slot>` crashes inside compat's
// `renderSlot` ("Cannot read properties of null (reading 'ce')") — a
// compat/decorator dual-vue interaction unrelated to this component's logic. So
// (as with zoomer + artefact-editor-toolbar) we exercise the compiled options'
// `methods` + `computed` getters/setters against a mock `this`.

const methods = (ImagedObjectEditorToolbar as any).methods as Record<string, (...a: any[]) => any>;
const computed = (ImagedObjectEditorToolbar as any).computed as Record<string, any>;
const mountedHook = (ImagedObjectEditorToolbar as any).mounted as (...a: any[]) => any;

function makeImagedObject(over: { recto?: boolean; verso?: boolean } = {}) {
    const stack = { id: 'stack' };
    return {
        recto: over.recto ?? true,
        verso: over.verso ?? true,
        getImageStack: vi.fn(() => stack),
    } as any;
}

function makeCtx(opts: {
    params?: ImagedObjectEditorParams;
    readOnly?: boolean;
    imagedObject?: any;
    side?: string;
    artefact?: any;
} = {}) {
    const params = opts.params ?? new ImagedObjectEditorParams();
    const state = {
        imagedObject: { params },
        editions: { current: { permission: { readOnly: opts.readOnly ?? false } } },
    };
    const ctx: any = {
        $state: state,
        $route: { params: { editionId: '9' } },
        $emit: vi.fn(),
        imagedObject: opts.imagedObject ?? makeImagedObject(),
        artefact: opts.artefact,
        side: opts.side ?? 'recto',
        sideFilter: {},
    };
    for (const [name, fn] of Object.entries(methods)) {
        ctx[name] = fn.bind(ctx);
    }
    for (const [name, def] of Object.entries(computed)) {
        if (typeof def === 'function') {
            Object.defineProperty(ctx, name, { get: def.bind(ctx), configurable: true });
        } else {
            Object.defineProperty(ctx, name, {
                get: def.get ? def.get.bind(ctx) : undefined,
                set: def.set ? def.set.bind(ctx) : undefined,
                configurable: true,
            });
        }
    }
    return ctx;
}

function lastEmit(ctx: any, name: string) {
    const calls = ctx.$emit.mock.calls.filter((c: any[]) => c[0] === name);
    return calls[calls.length - 1][1];
}

describe('imaged-object-editor-toolbar', () => {
    it('exposes params-derived computed getters', () => {
        const params = new ImagedObjectEditorParams();
        params.zoom = 0.2;
        const ctx = makeCtx({ params });
        expect(ctx.params).toBe(params);
        expect(ctx.imagedObjectState).toBe(ctx.$state.imagedObject);
        expect(ctx.zoomImagedObject).toBe(0.2);
        expect(ctx.editionId).toBe(9);
        expect(ctx.scrolled).toBe(true);
        expect(ctx.background).toBe(true);
        expect(ctx.highLight).toBe(true);
    });

    it('readOnly reflects the edition permission', () => {
        expect(makeCtx({ readOnly: true }).readOnly).toBe(true);
        expect(makeCtx({ readOnly: false }).readOnly).toBe(false);
    });

    it('imageStack uses the artefact side when present, otherwise the side prop', () => {
        const io = makeImagedObject();
        const withArtefact = makeCtx({ imagedObject: io, artefact: { side: 'verso' } });
        expect(withArtefact.imageStack).toBeTruthy();
        expect(io.getImageStack).toHaveBeenCalledWith('verso');

        const io2 = makeImagedObject();
        const withSide = makeCtx({ imagedObject: io2, side: 'recto' });
        expect(withSide.imageStack).toBeTruthy();
        expect(io2.getImageStack).toHaveBeenCalledWith('recto');
    });

    it('zoomImagedObject setter parses into params.zoom', () => {
        const params = new ImagedObjectEditorParams();
        const ctx = makeCtx({ params });
        ctx.zoomImagedObject = '0.55';
        expect(params.zoom).toBe(0.55);
    });

    it('onZoomChanged updates params.zoom', () => {
        const params = new ImagedObjectEditorParams();
        const ctx = makeCtx({ params });
        ctx.onZoomChanged(0.33);
        expect(params.zoom).toBe(0.33);
    });

    it('background / highLight setters update params', () => {
        const params = new ImagedObjectEditorParams();
        const ctx = makeCtx({ params });
        ctx.background = false;
        ctx.highLight = false;
        expect(params.background).toBe(false);
        expect(params.highLight).toBe(false);
    });

    it('onRotationAngleChanged updates params + emits paramsChanged', () => {
        const params = new ImagedObjectEditorParams();
        const ctx = makeCtx({ params });
        ctx.onRotationAngleChanged(90);
        expect(params.rotationAngle).toBe(90);
        expect(lastEmit(ctx, 'paramsChanged').property).toBe('rotationAngle');
    });

    it('onImageSettingChanged emits an imageSettings paramsChanged', () => {
        const params = new ImagedObjectEditorParams();
        const ctx = makeCtx({ params });
        ctx.onImageSettingChanged({} as any);
        expect(lastEmit(ctx, 'paramsChanged').property).toBe('imageSettings');
    });

    it('sideOptions lists recto and verso when both present', () => {
        const ctx = makeCtx({ imagedObject: makeImagedObject({ recto: true, verso: true }) });
        expect(ctx.sideOptions.map((o: any) => o.name)).toEqual(['recto', 'verso']);
    });

    it('sideOptions lists only the sides present', () => {
        const rectoOnly = makeCtx({ imagedObject: makeImagedObject({ recto: true, verso: false }) });
        expect(rectoOnly.sideOptions.map((o: any) => o.name)).toEqual(['recto']);
    });

    it('sideOptions is empty when there is no imaged object', () => {
        const ctx = makeCtx();
        ctx.imagedObject = undefined;
        expect(ctx.sideOptions).toEqual([]);
    });

    it('sideFilterChanged stores the filter and emits onSideArtefactChanged', () => {
        const ctx = makeCtx();
        const filter = { displayName: 'Verso', name: 'verso' };
        ctx.sideFilterChanged(filter);
        expect(ctx.sideFilter).toBe(filter);
        expect(lastEmit(ctx, 'onSideArtefactChanged')).toBe(filter);
    });

    it('editingModeChanged sets the drawing mode from the enum', () => {
        const params = new ImagedObjectEditorParams();
        const ctx = makeCtx({ params });
        ctx.editingModeChanged('ERASE');
        expect(params.drawingMode).toBe(DrawingMode.ERASE);
    });

    it('modeChosen compares against the current drawing mode', () => {
        const params = new ImagedObjectEditorParams();
        params.drawingMode = DrawingMode.DRAW;
        const ctx = makeCtx({ params });
        expect(ctx.modeChosen('DRAW')).toBe(true);
        expect(ctx.modeChosen('ERASE')).toBe(false);
    });

    it('mounted picks the sideFilter matching the side prop', async () => {
        const ctx = makeCtx({ side: 'verso', imagedObject: makeImagedObject() });
        await mountedHook.call(ctx);
        expect(ctx.sideFilter.name).toBe('verso');
    });

    it('mounted throws when the side prop is not among the options', async () => {
        const ctx = makeCtx({ side: 'nonsense', imagedObject: makeImagedObject() });
        await expect(mountedHook.call(ctx)).rejects.toThrow(/recto.*verso/);
    });
});
