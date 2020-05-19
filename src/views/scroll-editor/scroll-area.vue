<template>
    <zoomer :zoom="zoomLevel" @new-zoom="onNewZoom($event)">
        <svg
            :width="actualWidth"
            :height="actualHeight"
            :viewBox="`0 0 ${actualWidth} ${actualHeight}`"
        >
            <g :transform="transform" id="transform-root">
                <artefact-image-group
                   @on-select="selectArtefact(artefact)"
                    :artefact="artefact"
                    v-for="artefact in placedArtefacts" :key="artefact.id"
                    :selected="artefact===selectedArtefact"
                />
            </g>
        </svg>
    </zoomer>
</template>

<!-- <script src="https://unpkg.com/vue-toasted"></script>-->
<script lang="ts">
import { Component, Prop, Vue, Emit } from 'vue-property-decorator';
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
import {
    SingleImageSetting,
    ImageSetting
} from '@/components/image-settings/types';
import { ImageStack } from '@/models/image';
import { Artefact } from '@/models/artefact';
import { Polygon } from '@/utils/Polygons';
import ArtefactImageGroup from './artefact-image-group.vue';

@Component({
    name: 'scroll-area',
    components: {
        Waiting,
        zoomer: Zoomer,
        'artefact-image-group': ArtefactImageGroup
    }
})
export default class ScrollArea extends Vue {
    @Prop()
    public params!: ArtefactEditorParams;
    private imageWidth = 10000;
    private imageHeight = 10000;
    private imageSettings!: ImageSetting;
    private boundingBox = new BoundingBox(1, 1);
    private selectedArtefact: Artefact = {} as Artefact;

    private get artefacts() {
        return this.$state.artefacts.items || [];
    }

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
        return zoom;
    }
    private get placedArtefacts() {
        return this.artefacts.filter(x => x.isPlaced);
    }
    private selectArtefact(artefact: Artefact) {
        this.selectedArtefact = artefact;
        this.$emit('onSelectArtefact', this.selectedArtefact);
    }

}
</script>

<style lang="scss" scoped>
#transform-root {
    transform-origin: center;
}
</style>
