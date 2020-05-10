<template>
        <zoomer :zoom="zoomLevel" :angle="angle"> <!-- Add an event to handle zoom (newZoom). Don't add the angle, we don't need rotation -->
            <svg :width="svgWidth" :height="svgHeight" :viewBox="`0 0 ${svgWidth} ${svgHeight}`">
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
    @Prop() public paramsArea: ArtefactEditorParams = new ArtefactEditorParams(); // Shaindel - rename to params
    private imageWidth = 10000;
    private imageHeight = 10000;
    private boundingBox = new BoundingBox(1, 1);


   private get svgWidth(): number { // Shaindel - Rename to actualWidth
        return this.imageWidth * this.zoomLevel;
    }

    private get svgHeight(): number { // Shaindel - rename to actualHeight
        return this.imageHeight * this.zoomLevel;
    }
    private get positionX(): number {
        return this.svgWidth / 2;
    }
    private get positionY(): number {
        return this.svgHeight / 2;
    }

    private get imgWidth(): number {
        return 200;
    }

    private get zoomLevel() {
        return this.paramsArea.zoom;
    }

    private set zoomLevel(val) {
        return this.paramsArea.zoom;
    }

    private get angle() {
        return this.paramsArea.rotationAngle;
    }


    private get transform(): string {
        const zoom = `scale(${this.zoomLevel})`;
        return `${zoom}`;
    }
}
</script>

<style lang="scss" scoped>
#transform-root{
    transform-origin: center;
}

</style>
