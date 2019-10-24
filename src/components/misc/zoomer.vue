<template>
    <div @wheel="onWheel($event)" v-hammer:pinch="onPinch">
        <slot></slot>
    </div>
</template>

<script lang="ts">
/*
 * This component handles zooming requests (ctrl-mousewheel and hopefully pinching in the future) properly,
 * by, keeping the mouse (and hopefully pinch center) in place while changing the zoom.
 *
 * Communications with the outside is done with a zoom property and a newZoom event, which should be used by
 * the surrounding components to change the actual zoom.
 *
 * The zoomer component should be placed right inside the div with the scrollbars. Zooming occurs on the zoomer's
 * parent element.
 */
import { Component, Prop, Vue, Emit } from 'vue-property-decorator';
import { Point } from '@/utils/helpers';

export interface ZoomEventArgs {
    zoom: number;
}

@Component({
    name: 'zoomer',
})
export default class Zoomer extends Vue {
    @Prop() private zoom!: number;

    @Emit()
    private newZoom(zoom: number): ZoomEventArgs {
        return { zoom };
    }

    private onWheel(event: WheelEvent) {
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
            y: event.clientY - viewport.top + this.zoomTarget.scrollTop,
        };

        this.applyZoom(amount, mousePosition);
    }

    private applyZoom(amount: number, position: Point) {
        const oldZoom = this.zoom;
        const newZoom = Math.min(Math.max(oldZoom + amount, 0.05), 1);
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

        // We call setTimeout to update the actual scrolling position, since Vue needs to process everything else
        // in this event, including the newZoom call.
        /* setTimeout(() => {
            console.log(`Scrolling by ${scrollDelta.x}, ${scrollDelta.y}`);
            this.zoomTarget.scrollLeft += scrollDelta.x;
            this.zoomTarget.scrollTop += scrollDelta.y;
        }, 0); */
        console.log(`Scrolling by ${scrollDelta.x}, ${scrollDelta.y}`);
        this.zoomTarget.scrollLeft += scrollDelta.x;
        this.zoomTarget.scrollTop += scrollDelta.y;
    }
    private onPinch(event: any) {
        // Determine the amount based on additionalEvent: pinchin for zooming out, pinchout for zooming in
        const amount = event.additionalEvent === 'pinchin' ? -0.01 : 0.01;

        // We get the center in screen coordinates, we need to convert them to the right position
        const viewport = this.zoomTarget.getBoundingClientRect();
        const position: Point = {
            x: event.center.x - viewport.left + this.zoomTarget.scrollLeft,
            y: event.center.y - viewport.top + this.zoomTarget.scrollTop,
        };

        this.applyZoom(amount, position);
    }

    private get zoomTarget(): Element {
        return this.$el.parentElement!;
    }
}
</script>

<style lang="scss" scoped>
</style>
