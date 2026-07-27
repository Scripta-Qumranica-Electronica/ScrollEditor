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
 * Touch gestures are implemented with native Pointer Events (no dependency). The old
 * vue2-hammer `v-hammer:pinch/:rotate` directive was dead under Vue 3 (Vue-2 plugin,
 * and only @types/vue2-hammer was ever installed — no runtime).
 */
import { Component, Prop, Vue, Emit, toNative } from 'vue-facing-decorator';
import { Point } from '@/utils/helpers';

export interface ZoomEventArgs {
    zoom: number;
}

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
    // Two-finger gesture baseline, captured when the second pointer lands.
    private gestureStartDist = 0;
    private gestureStartAngle = 0;   // angle (deg) of the line between the two pointers
    private gestureStartRotation = 0; // this.angle prop at gesture start
    private lastDist = 0;

    @Emit()
    public newZoom(zoom: number): ZoomEventArgs {
        return { zoom };
    }

    @Emit()
    public newRotate(rotate: number): RotateEventArgs {
        return { rotate };
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

    // --- Two-finger pinch (zoom) + rotate, via Pointer Events -------------------
    public onPointerDown(event: PointerEvent) {
        if (event.pointerType === 'mouse') {
            return; // mouse zoom is handled by the wheel
        }
        this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (this.pointers.size === 2) {
            const [a, b] = [...this.pointers.values()];
            this.gestureStartDist = this.lastDist = this.distance(a, b);
            this.gestureStartAngle = this.lineAngle(a, b);
            this.gestureStartRotation = this.angle;
        }
    }

    public onPointerMove(event: PointerEvent) {
        if (!this.pointers.has(event.pointerId)) {
            return;
        }
        this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (this.pointers.size !== 2) {
            return;
        }
        event.preventDefault();
        const [a, b] = [...this.pointers.values()];
        const dist = this.distance(a, b);
        const center: Point = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };

        // Pinch -> multiplicative zoom about the pinch center, keeping it in place.
        if (this.lastDist > 0 && dist > 0) {
            const amount = this.zoom * (dist / this.lastDist - 1);
            const viewport = this.zoomTarget.getBoundingClientRect();
            const position: Point = {
                x: center.x - viewport.left + this.zoomTarget.scrollLeft,
                y: center.y - viewport.top + this.zoomTarget.scrollTop
            };
            this.applyZoom(amount, position);
        }
        this.lastDist = dist;

        // Rotate -> absolute angle = rotation at gesture start + finger-line delta.
        let delta = this.lineAngle(a, b) - this.gestureStartAngle;
        if (delta > 180) { delta -= 360; }
        if (delta < -180) { delta += 360; }
        this.newRotate(this.gestureStartRotation + delta);
    }

    public onPointerEnd(event: PointerEvent) {
        this.pointers.delete(event.pointerId);
        if (this.pointers.size < 2) {
            this.lastDist = 0;
        }
    }

    private distance(a: Point, b: Point): number {
        return Math.hypot(b.x - a.x, b.y - a.y);
    }

    private lineAngle(a: Point, b: Point): number {
        return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
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
    // two-finger pinch/rotate to our pointer handlers instead of native page zoom.
    touch-action: pan-x pan-y;
}
</style>
