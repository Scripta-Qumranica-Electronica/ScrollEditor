<template>
    <zoomer :zoom="zoomLevel" @new-zoom="onNewZoom($event)">
        <svg :width="actualWidth" :height="actualHeight" :viewBox="`0 0 ${actualWidth} ${actualHeight}`">
            <g :transform="transform" id="transform-root">
                <circle
                    :cx="positionX"
                    :cy="positionY"
                    :r="imgWidth"
                    stroke="green"
                    stroke-width="4"
                    fill="yellow"
                />
            </g>
        </svg>
    </zoomer>
</template>

<!-- <script src="https://unpkg.com/vue-toasted"></script>-->
<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import Waiting from '@/components/misc/Waiting.vue';
import ScrollMenu from './scroll-menu.vue';
import Zoomer, {
    ZoomEventArgs,
    RotateEventArgs
} from '@/components/misc/zoomer.vue';
import {
    ArtefactEditorParamsChangedArgs,
    ArtefactEditorParams
} from '../artefact-editor/types';
import { BoundingBox } from '@/utils/helpers';

@Component({
    name: 'scroll-area',
    components: {
        Waiting,
        zoomer: Zoomer
    }
})
export default class ScrollArea extends Vue {
    @Prop()
    public params!: ArtefactEditorParams; // Shaindel - rename to params
    private imageWidth = 10000;
    private imageHeight = 10000;
    private boundingBox = new BoundingBox(1, 1);

    private get actualWidth(): number {
        return this.imageWidth * this.zoomLevel;
    }

    private get actualHeight(): number {
        return this.imageHeight * this.zoomLevel;
    }
    private get positionX(): number {
        return this.actualWidth / 2;
    }
    private get positionY(): number {
        return this.actualHeight / 2;
    }

    private get imgWidth(): number {
        return 200;
    }

    private get zoomLevel() {
        return this.params.zoom;
    }

    private onNewZoom(event: ZoomEventArgs) {
        this.params.zoom = parseFloat(event.zoom.toString());
    }

    private get transform(): string {
        const zoom = `scale(${this.zoomLevel})`;
        return `${zoom}`;
    }
}
</script>

<style lang="scss" scoped>
#transform-root {
    transform-origin: center;
}
</style>
