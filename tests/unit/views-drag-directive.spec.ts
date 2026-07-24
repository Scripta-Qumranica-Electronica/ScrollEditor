import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Draggable } from '@/views/scroll-editor/drag-directive';
import type { DraggableValue } from '@/views/scroll-editor/drag-directive';

/*
 * Unit tests for the Draggable Vue directive (src/views/scroll-editor/drag-directive.ts).
 *
 * The directive is a closure factory: every hook wires up mousedown/touchstart
 * listeners on the handle element and stores drag state as a JSON string in the
 * element's `draggable-state` attribute. We drive it purely by dispatching DOM
 * events and reading that attribute / the element's inline style, plus asserting
 * the callbacks fire with the expected geometry.
 *
 * happy-dom returns an all-zero getBoundingClientRect by default, so where the
 * geometry matters we stub getBoundingClientRect on the element under test.
 */

const NOOP_VNODE = {} as any;

function stubRect(el: HTMLElement, rect: Partial<DOMRect>): void {
    const full: DOMRect = {
        x: rect.left ?? 0,
        y: rect.top ?? 0,
        left: rect.left ?? 0,
        top: rect.top ?? 0,
        right: rect.right ?? (rect.left ?? 0) + (rect.width ?? 0),
        bottom: rect.bottom ?? (rect.top ?? 0) + (rect.height ?? 0),
        width: rect.width ?? 0,
        height: rect.height ?? 0,
        toJSON: () => ({}),
    };
    el.getBoundingClientRect = () => full;
}

function mount(value: DraggableValue | undefined, el = document.createElement('div')) {
    const binding = { value } as any;
    (Draggable.beforeMount as any)(el, binding, NOOP_VNODE, null);
    return { el, binding };
}

function getState(el: HTMLElement): any {
    const raw = el.getAttribute('draggable-state');
    return raw ? JSON.parse(raw) : null;
}

function mouse(type: string, clientX: number, clientY: number): MouseEvent {
    return new MouseEvent(type, { clientX, clientY, bubbles: true, cancelable: true });
}

// The directive attaches `move`/`moveEnd` listeners to `document` on drag start
// and only removes them on drag end. A test that starts a drag without ending it
// would leak listeners into the next test (they all react to a shared document
// mousemove). Fire mouseup/touchend after each test so every lingering moveEnd
// detaches its own listeners.
afterEach(() => {
    document.dispatchEvent(new MouseEvent('mouseup', { clientX: 0, clientY: 0 }));
    document.dispatchEvent(new TouchEvent('touchend', { changedTouches: [{ clientX: 0, clientY: 0 } as any] }));
});

describe('Draggable directive — wiring', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    it('beforeMount marks the element draggable and initialises state', () => {
        const { el } = mount({});
        expect(el.getAttribute('draggable')).toBe('true');
        // initializeState was called -> a draggable-state attribute exists (even
        // though the rect is 0x0 so the position values are effectively empty).
        expect(el.hasAttribute('draggable-state')).toBe(true);
    });

    it('stopDragging short-circuits updated (no draggable attribute set)', () => {
        const el = document.createElement('div');
        (Draggable.updated as any)(el, { value: { stopDragging: true } }, NOOP_VNODE, NOOP_VNODE);
        expect(el.getAttribute('draggable')).toBeNull();
    });

    it('registers only once — a second updated does not re-add the attribute machinery', () => {
        const { el, binding } = mount({});
        const addSpy = vi.spyOn(el, 'addEventListener');
        (Draggable.updated as any)(el, binding, NOOP_VNODE, NOOP_VNODE);
        // Already has draggable=true, so no new mousedown listener wiring happens.
        expect(addSpy).not.toHaveBeenCalledWith('mousedown', expect.anything());
    });

    it('uses a separate handle element when provided', () => {
        const el = document.createElement('div');
        const handle = document.createElement('span');
        mount({ handle }, el);
        // The handle carries the draggable attribute, not the element itself.
        expect(handle.getAttribute('draggable')).toBe('true');
        expect(el.getAttribute('draggable')).toBeNull();
    });

    it('extracts a component-instance handle via its $el', () => {
        const el = document.createElement('div');
        const inner = document.createElement('b');
        const handle = { $el: inner } as any;
        mount({ handle }, el);
        expect(inner.getAttribute('draggable')).toBe('true');
    });
});

describe('Draggable directive — drag lifecycle & math', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    it('onDragStart fires on mousedown and records the initial mouse position (y offset -56)', () => {
        const el = document.createElement('div');
        const onDragStart = vi.fn();
        mount({ onDragStart }, el);

        el.dispatchEvent(mouse('mousedown', 100, 200));

        expect(onDragStart).toHaveBeenCalledTimes(1);
        const state = getState(el);
        expect(state.initialMousePos).toEqual({ left: 100, top: 200 - 56 });
    });

    it('a mousemove translates the element by the pointer delta and fires onPositionChange', () => {
        const el = document.createElement('div');
        // Non-zero rect so getRectPosition yields a start position.
        stubRect(el, { left: 10, top: 66, width: 40, height: 40 });
        const onPositionChange = vi.fn();
        mount({ onPositionChange }, el);

        // Re-init now that the rect is non-zero, then start the drag.
        el.dispatchEvent(mouse('mousedown', 100, 200));
        // move 30px right, 15px down
        document.dispatchEvent(mouse('mousemove', 130, 215));

        expect(onPositionChange).toHaveBeenCalled();
        // start position: left=10, top=66-56=10; delta = (130-100, (215-56)-(200-56)) = (30,15)
        expect(el.style.left).toBe(`${10 + 30}px`);
        expect(el.style.top).toBe(`${10 + 15}px`);
        expect(el.style.position).toBe('fixed');
        expect(el.style.touchAction).toBe('none');
    });

    it('onDragEnd fires on mouseup and snapshots the rect position', () => {
        const el = document.createElement('div');
        stubRect(el, { left: 70, top: 156, width: 40, height: 40 });
        const onDragEnd = vi.fn();
        mount({ onDragEnd }, el);

        el.dispatchEvent(mouse('mousedown', 100, 200));
        document.dispatchEvent(mouse('mousemove', 120, 220));
        document.dispatchEvent(mouse('mouseup', 120, 220));

        expect(onDragEnd).toHaveBeenCalledTimes(1);
        const state = getState(el);
        // After moveEnd the drag/current positions come from getRectPosition:
        // { left: 70, top: 156-56 }
        expect(state.currentDragPosition).toEqual({ left: 70, top: 100 });
        expect(state.startDragPosition).toEqual({ left: 70, top: 100 });
        expect(state.initialMousePos).toBeUndefined();
    });

    it('stopDragging aborts an in-flight move (no style update)', () => {
        const el = document.createElement('div');
        stubRect(el, { left: 10, top: 66, width: 40, height: 40 });
        const value: DraggableValue = { onPositionChange: vi.fn() };
        mount(value, el);
        el.dispatchEvent(mouse('mousedown', 100, 200));
        // initializeState (at mount) applied the baseline position; capture it.
        const baselineLeft = el.style.left; // '10px' from getRectPosition
        // Flip the flag on the SAME binding.value object the closure captured.
        value.stopDragging = true;
        document.dispatchEvent(mouse('mousemove', 200, 200));
        // move() returned early, so the position is unchanged from the baseline
        // (a real drag to clientX 200 would have shifted it well past 10px).
        expect(el.style.left).toBe(baselineLeft);
        expect(el.style.left).toBe('10px');
    });
});

describe('Draggable directive — bounding constraints', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    it('clamps the element to a provided boundingRect (top-left boundary)', () => {
        const el = document.createElement('div');
        stubRect(el, { left: 100, top: 156, width: 20, height: 20 });
        // boundingRect: top boundary is boundingRect.top - 56 = 100 - 56 = 44,
        // left boundary is boundingRect.left = 50.
        const boundingRect = {
            top: 100, bottom: 400, left: 50, right: 400, width: 350, height: 300,
        } as ClientRect;
        mount({ boundingRect }, el);

        el.dispatchEvent(mouse('mousedown', 200, 200)); // start pos: {left:100, top:100}
        // Drag far up-left so we blow past the top/left boundaries.
        document.dispatchEvent(mouse('mousemove', 0, 0));

        // Clamped to left boundary (50) and top boundary (44).
        expect(el.style.left).toBe('50px');
        expect(el.style.top).toBe('44px');
    });

    it('clamps to the bottom-right boundary (accounts for element width/height)', () => {
        const el = document.createElement('div');
        stubRect(el, { left: 100, top: 156, width: 30, height: 30 });
        const boundingRect = {
            top: 100, bottom: 300, left: 0, right: 200, width: 200, height: 200,
        } as ClientRect;
        mount({ boundingRect }, el);

        el.dispatchEvent(mouse('mousedown', 200, 200));
        // Drag far down-right.
        document.dispatchEvent(mouse('mousemove', 9999, 9999));

        // rightBoundary - width = 200 - 30 = 170; bottomBoundary - height = 300 - 30 = 270.
        expect(el.style.left).toBe('170px');
        expect(el.style.top).toBe('270px');
    });

    it('honours boundingRectMargin when clamping', () => {
        const el = document.createElement('div');
        stubRect(el, { left: 100, top: 156, width: 20, height: 20 });
        const boundingRect = {
            top: 100, bottom: 400, left: 50, right: 400, width: 350, height: 300,
        } as ClientRect;
        // left boundary = 50 + marginLeft(10) = 60; top boundary = 100 - 56 + marginTop(6) = 50.
        mount({ boundingRect, boundingRectMargin: { left: 10, top: 6 } }, el);

        el.dispatchEvent(mouse('mousedown', 200, 200));
        document.dispatchEvent(mouse('mousemove', 0, 0));

        expect(el.style.left).toBe('60px');
        expect(el.style.top).toBe('50px');
    });

    it('derives the bounding rect from boundingElement.getBoundingClientRect', () => {
        const el = document.createElement('div');
        stubRect(el, { left: 100, top: 156, width: 20, height: 20 });
        const boundingElement = document.createElement('div');
        stubRect(boundingElement, { left: 50, top: 100, right: 400, bottom: 400, width: 350, height: 300 });
        mount({ boundingElement }, el);

        el.dispatchEvent(mouse('mousedown', 200, 200));
        document.dispatchEvent(mouse('mousemove', 0, 0));

        // Same clamp as the boundingRect case: left->50, top->44.
        expect(el.style.left).toBe('50px');
        expect(el.style.top).toBe('44px');
    });
});

describe('Draggable directive — touch input', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    function touch(type: string, clientX: number, clientY: number): TouchEvent {
        // happy-dom TouchEvent reads changedTouches from init.
        return new TouchEvent(type, {
            changedTouches: [{ clientX, clientY } as any],
            bubbles: true,
            cancelable: true,
        });
    }

    it('records the initial touch position on touchstart (last changed touch, y-56)', () => {
        const el = document.createElement('div');
        const onDragStart = vi.fn();
        mount({ onDragStart }, el);
        el.dispatchEvent(touch('touchstart', 80, 120));
        expect(onDragStart).toHaveBeenCalled();
        const state = getState(el);
        expect(state.initialMousePos).toEqual({ left: 80, top: 120 - 56 });
    });
});

describe('Draggable directive — reset & initial position', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    it('resetInitialPos re-initialises state on update', () => {
        const el = document.createElement('div');
        const onPositionChange = vi.fn();
        mount({ onPositionChange }, el);
        onPositionChange.mockClear();
        (Draggable.updated as any)(
            el,
            { value: { resetInitialPos: true, onPositionChange } },
            NOOP_VNODE,
            NOOP_VNODE,
        );
        // resetInitialPos path calls initializeState() + handlePositionChanged().
        expect(onPositionChange).toHaveBeenCalled();
    });

    it('an explicit initialPosition seeds the drag state', () => {
        const el = document.createElement('div');
        mount({ initialPosition: { left: 12, top: 34 } }, el);
        const state = getState(el);
        expect(state.initialPosition).toEqual({ left: 12, top: 34 });
        expect(state.startDragPosition).toEqual({ left: 12, top: 34 });
    });
});
