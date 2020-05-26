<template>
<div ref="scrollArea" id="outer">
    <div v-draggable="draggableOptions" v-show="selectedArtefact" style="position: absolute;">
        <div ref="handleTools" style="width:16px;height:22px;background:#ccc; text-align:center; cursor: move">
            <i class="fa fa-ellipsis-v"></i>
        </div>
        <artefact-toolsbox :params="params" :float="true" :artefact="selectedArtefact"></artefact-toolsbox>
    </div>
    <zoomer :zoom="zoomLevel" @new-zoom="onNewZoom($event)">
      
        <svg
            :width="actualWidth"
            :height="actualHeight"
            :viewBox="`0 0 ${actualWidth} ${actualHeight}`"
        >
            <g id="root" :transform="transform">
                <!-- <artefact-toolsbox :artefact="artefact"></artefact-toolsbox> -->
                <artefact-image-group
                   @on-select="selectArtefact(artefact)"
                    :artefact="artefact"
                    v-for="artefact in placedArtefacts" :key="artefact.id"
                    :selected="artefact===selectedArtefact"
                />
            </g>
        </svg>
    </zoomer>
    </div>
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
    ArtefactEditorParams,
    ScrollEditorParams
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
import ArtefactToolsbox from './artefact-toolsbox.vue';
import { Draggable, DraggableValue } from './drag-directive';

@Component({
    name: 'scroll-area',
    components: {
        Waiting,
        'zoomer': Zoomer,
        'artefact-image-group': ArtefactImageGroup,
        'artefact-toolsbox': ArtefactToolsbox
    },
    directives: {
        Draggable
    }
})
export default class ScrollArea extends Vue {
    @Prop()
    public params!: ScrollEditorParams;
    private imageWidth = 10000;
    private imageHeight = 10000;
    private imageSettings!: ImageSetting;
    private boundingBox = new BoundingBox(1, 1);
    private selectedArtefact: Artefact | undefined = {} as Artefact;
    private draggableOptions: DraggableValue = {};

    private mounted() {
        this.selectedArtefact = undefined;

        this.draggableOptions.handle = this.$refs.handleTools as HTMLElement;
        this.draggableOptions.boundingElement = this.$refs.scrollArea as HTMLElement;
    }

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
        return this.params && this.params.zoom || 0;
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

<style lang="scss">
</style>
