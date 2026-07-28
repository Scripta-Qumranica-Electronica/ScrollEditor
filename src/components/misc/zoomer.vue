<template>
    <div
        class="zoomer"
        @wheel="onWheel($event)"
        @pointerdown="onPointerDown($event)"
        @pointermove="onPointerMove($event)"
        @pointerup="onPointerEnd($event)"
        @pointercancel="onPointerEnd($event)"
    >
        <slot></slot>
    </div>
</template>

<script lang="ts">
/*
 * This component handles zooming requests properly (ctrl-mousewheel and two-finger
 * pinch/rotate), by keeping the mouse / pinch-center in place while changing the zoom.
 *
 * Communications with the outside is done with a zoom property and a newZoom event, which should be used by
 * the surrounding components to change the actual zoom.
 *
 * The zoomer component should be placed right inside the div with the scrollbars. Zooming occurs on the zoomer's
 * parent element.
 *
 * Touch pinch-zoom is implemented with native Pointer Events (no dependency). The old
 * vue2-hammer `v-hammer:pinch/:rotate` directive was dead under Vue 3 (Vue-2 plugin,
 * and only @types/vue2-hammer was ever installed — no runtime).
 */
import { Component, Prop, Vue, Emit, toNative } from 'vue-facing-decorator';
import { Point } from '@/utils/helpers';

// Pinch sensitivity: how much zoom changes per pixel of finger-spread change. The map
// is LINEAR and absolute from the gesture's start (target = startZoom + Δspread * this),
// so the feel is uniform across the whole 0.05..1 range and 100% is always reachable —
// unlike a multiplicative map, whose step scales with the current zoom (fast/near-min,
// crawling/near-max). ~250px of spread covers the full range.
const PINCH_ZOOM_PER_PX = 0.004;

export interface ZoomEventArgs {
    zoom: number;
}

// Kept for the artefact editor's @new-rotate hook. Pinch-rotate is currently not
// emitted (it interfered with pinch-zoom and wasn't needed); rotation is driven by
// the rotate toolbar. Re-add a two-finger rotate emit here if that changes.
export interface RotateEventArgs {
    rotate: number;
}

@Component({
    name: 'zoomer'
})
class Zoomer extends Vue {
    @Prop() public zoom!: number;
    @Prop({ default: 0 }) public angle!: number;
    public degel = false;

    // Active touch/pen pointers on the zoomer, keyed by pointerId.
    private pointers = new Map<number, Point>();
    // Two-finger pinch baseline, captured when the second pointer lands.
    private gestureStartDist = 0;
    private gestureStartZoom = 0; // this.zoom at gesture start

    @Emit()
    public newZoom(zoom: number): ZoomEventArgs {
        return { zoom };
    }
    public onWheel(event: WheelEvent) {
        if (!event.ctrlKey) {
            return;
        }
        event.preventDefault(); // Don't use the browser's zoom mechanism here, just ours
        const amount = event.deltaY < 0 ? +0.01 : -0.01; // wheel up - zoom in.

        // After changing the zoom, we want to change the scrollbars to that the mouse cursor stays
        // on the same place in the image. First we need to know the exact coordinates before the zoom
        // We get screen cordinates, we need to translate them to client coordinates
        const viewport = this.zoomTarget.getBoundingClientRect();
        const mousePosition: Point = {
            x: event.clientX - viewport.left + this.zoomTarget.scrollLeft,
            y: event.clientY - viewport.top + this.zoomTarget.scrollTop
        };

        this.applyZoom(amount, mousePosition);
    }

    public applyZoom(amount: number, position: Point) {
        const oldZoom = this.zoom;
        const newZoom = Math.min(Math.max(oldZoom + amount, 0.05), 1);

        if (this.degel) {
            return;
        }

        if (newZoom === oldZoom) {
            return;
        }

        const newPosition: Point = {
            x: (position.x * newZoom) / oldZoom,
            y: (position.y * newZoom) / oldZoom
        };
        const scrollDelta: Point = {
            x: newPosition.x - position.x,
            y: newPosition.y - position.y
        };

        this.newZoom(newZoom);

        this.zoomTarget.scrollLeft += scrollDelta.x;
        this.zoomTarget.scrollTop += scrollDelta.y;
    }

    // --- Two-finger pinch-zoom, via Pointer Events ------------------------------
    public onPointerDown(event: PointerEvent) {
        if (event.pointerType === 'mouse') {
            return; // mouse zoom is handled by the wheel
        }
        this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (this.pointers.size === 2) {
            const [a, b] = [...this.pointers.values()];
            this.gestureStartDist = this.distance(a, b);
            this.gestureStartZoom = this.zoom;
        }
    }

    public onPointerMove(event: PointerEvent) {
        if (!this.pointers.has(event.pointerId)) {
            return;
        }
        this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (this.pointers.size !== 2 || this.gestureStartDist <= 0) {
            return;
        }
        event.preventDefault();
        const [a, b] = [...this.pointers.values()];
        const dist = this.distance(a, b);
        const center: Point = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };

        // Linear, absolute from the gesture start: the target zoom is the start zoom
        // plus the finger-spread change scaled by a constant. Uniform feel across the
        // range and 100% is always reachable. applyZoom does the clamp + keep the pinch
        // centre in place; feeding it (target - current) makes the result converge to
        // `target` regardless of any async lag in the `zoom` prop.
        const target = this.gestureStartZoom + (dist - this.gestureStartDist) * PINCH_ZOOM_PER_PX;
        const amount = Math.min(Math.max(target, 0.05), 1) - this.zoom;
        if (amount !== 0) {
            const viewport = this.zoomTarget.getBoundingClientRect();
            const position: Point = {
                x: center.x - viewport.left + this.zoomTarget.scrollLeft,
                y: center.y - viewport.top + this.zoomTarget.scrollTop
            };
            this.applyZoom(amount, position);
        }
    }

    public onPointerEnd(event: PointerEvent) {
        this.pointers.delete(event.pointerId);
        if (this.pointers.size < 2) {
            this.gestureStartDist = 0;
        }
    }

    private distance(a: Point, b: Point): number {
        return Math.hypot(b.x - a.x, b.y - a.y);
    }

    public get zoomTarget(): Element {
        return this.$el.parentElement!;
    }
}
export default toNative(Zoomer);
</script>

<style lang="scss" scoped>
.zoomer {
    // Let the browser keep single-finger panning of the scroll parent, but route
    // two-finger pinch to our pointer handlers instead of native page zoom.
    touch-action: pan-x pan-y;
}
</style>
