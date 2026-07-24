import { describe, it, expect, vi } from 'vitest';
import ArtefactEditorToolbar from '@/views/artefact-editor/artefact-editor-toolbar.vue';
import { ArtefactEditorParams } from '@/views/artefact-editor/types';

// Unit test for the artefact-editor toolbar's behaviour.
//
// NOTE: this component's template renders a top-level `<slot />`. Under this
// project's `@vue/compat` (MODE 2) + `vue-facing-decorator` setup, mounting a
// component whose own root template contains a bare `<slot>` crashes inside
// compat's `renderSlot` ("Cannot read properties of null (reading 'ce')") —
// `currentRenderingInstance` resolves null due to a compat/decorator dual-vue
// interaction unrelated to this component's logic. So (as with zoomer) we
// exercise the compiled options' `methods` + `computed` getters/setters against
// a mock `this`, asserting the `paramsChanged` events via a spied `$emit`.

const methods = (ArtefactEditorToolbar as any).methods as Record<string, (...a: any[]) => any>;
const computed = (ArtefactEditorToolbar as any).computed as Record<string, any>;
const mountedHook = (ArtefactEditorToolbar as any).mounted as (...a: any[]) => any;

function makeCtx(params: ArtefactEditorParams, readOnly = false) {
    const state = {
        artefactEditor: { params },
        editions: { current: { permission: { readOnly } } },
        prepare: { edition: vi.fn().mockResolvedValue(undefined) },
        imagedObjects: { find: vi.fn() },
    };
    const ctx: any = {
        $state: state,
        $route: { params: { editionId: '5' } },
        $emit: vi.fn(),
        imageStack: {},
    };
    // Bind methods.
    for (const [name, fn] of Object.entries(methods)) {
        ctx[name] = fn.bind(ctx);
    }
    // Wire computed getters/setters onto the ctx as accessor properties so that
    // reads like `this.params` / `this.artefactEditorState` resolve correctly.
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

describe('artefact-editor-toolbar', () => {
    it('exposes params-derived computed getters', () => {
        const params = new ArtefactEditorParams();
        params.zoom = 0.3;
        const ctx = makeCtx(params);
        expect(ctx.params).toBe(params);
        expect(ctx.artefactEditorState).toBe(ctx.$state.artefactEditor);
        expect(ctx.zoomArtefact).toBe(0.3);
        expect(ctx.editionId).toBe(5);
        expect(ctx.scrolled).toBe(true);
    });

    it('params falls back to a fresh ArtefactEditorParams when absent', () => {
        const ctx = makeCtx(undefined as any);
        expect(ctx.params).toBeInstanceOf(ArtefactEditorParams);
    });

    it('readOnly reflects the current edition permission', () => {
        expect(makeCtx(new ArtefactEditorParams(), true).readOnly).toBe(true);
        expect(makeCtx(new ArtefactEditorParams(), false).readOnly).toBe(false);
    });

    it('onZoomChanged updates params.zoom and emits paramsChanged', () => {
        const params = new ArtefactEditorParams();
        const ctx = makeCtx(params);
        ctx.onZoomChanged(0.42);
        expect(params.zoom).toBe(0.42);
        const arg = lastEmit(ctx, 'paramsChanged');
        expect(arg.property).toBe('zoomArtefact');
        expect(arg.value).toBe(0.42);
        expect(arg.params).toBe(params);
    });

    it('zoomArtefact setter parses + notifies', () => {
        const params = new ArtefactEditorParams();
        const ctx = makeCtx(params);
        ctx.zoomArtefact = '0.7';
        expect(params.zoom).toBe(0.7);
        expect(lastEmit(ctx, 'paramsChanged').property).toBe('zoomArtefact');
    });

    it('onRotationAngleChanged updates params.rotationAngle and emits', () => {
        const params = new ArtefactEditorParams();
        const ctx = makeCtx(params);
        ctx.onRotationAngleChanged(90);
        expect(params.rotationAngle).toBe(90);
        expect(lastEmit(ctx, 'paramsChanged').property).toBe('rotationAngle');
    });

    it('onFontSizeChanged updates params.fontSize and emits', () => {
        const params = new ArtefactEditorParams();
        const ctx = makeCtx(params);
        ctx.onFontSizeChanged(18);
        expect(params.fontSize).toBe(18);
        expect(lastEmit(ctx, 'paramsChanged').property).toBe('fontSize');
    });

    it('onImageSettingChanged emits an imageSettings paramsChanged', () => {
        const params = new ArtefactEditorParams();
        const ctx = makeCtx(params);
        ctx.onImageSettingChanged({} as any);
        const arg = lastEmit(ctx, 'paramsChanged');
        expect(arg.property).toBe('imageSettings');
        expect(arg.value).toBe(params.imageSettings);
    });

    it('mounted prepares the edition and skips image-stack lookup for a virtual artefact', async () => {
        const ctx = makeCtx(new ArtefactEditorParams());
        ctx.artefact = { id: 1, editionId: 5, isVirtual: true } as any;
        await mountedHook.call(ctx);
        expect(ctx.$state.prepare.edition).toHaveBeenCalledWith(5);
        expect(ctx.$state.imagedObjects.find).not.toHaveBeenCalled();
    });

    it('mounted resolves the image stack for a non-virtual artefact', async () => {
        const stack = { id: 'stack' };
        const ctx = makeCtx(new ArtefactEditorParams());
        ctx.$state.imagedObjects.find = vi.fn(() => ({ getImageStack: () => stack }));
        ctx.artefact = {
            id: 2,
            editionId: 7,
            isVirtual: false,
            imagedObjectId: 'io-1',
            side: 'recto',
        } as any;
        await mountedHook.call(ctx);
        expect(ctx.$state.prepare.edition).toHaveBeenCalledWith(7);
        expect(ctx.$state.imagedObjects.find).toHaveBeenCalledWith('io-1');
        expect(ctx.imageStack).toBe(stack);
    });

    it('mounted throws when the imaged object is missing', async () => {
        const ctx = makeCtx(new ArtefactEditorParams());
        ctx.$state.imagedObjects.find = vi.fn(() => undefined);
        ctx.artefact = {
            id: 3,
            editionId: 8,
            isVirtual: false,
            imagedObjectId: 'missing',
            side: 'recto',
        } as any;
        await expect(mountedHook.call(ctx)).rejects.toThrow(/Can't find ImagedObject/);
    });
});
