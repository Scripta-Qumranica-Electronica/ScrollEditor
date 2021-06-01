<template>
    <div ref="scrollArea" id="outer">
        <div
            v-draggable="draggableOptions"
            v-show="selectedArtefact || selectedGroup"
            style="position: fixed"
        >
            <div ref="handleTools" class="handle-tools">
                <i class="fa fa-ellipsis-v"></i>
            </div>

        </div>
        <zoomer :zoom="zoomLevel" @new-zoom="onNewZoom($event)">
            <svg
                id="the-scroll"
                :width="actualWidth"
                :height="actualHeight"
                :viewBox="`${actualXOrigin} ${actualYOrigin} ${actualWidth} ${actualHeight}`"
                @click="onScrollClick"
                @mousemove="onMouseMove"
            >


                <g id="root" :transform="transform">
                    <defs id="before-root" v-if= "currentScript" >
                        <path
                            v-for="g of Object.values(scriptGlyphs)"
                            :key="g.character"
                            :d="g.shape.svg"
                            :id="`path-${g.character}`"
                            class="sign"
                        />
                    </defs>

                    <artefact-image-group
                        @on-select="selectArtefact(artefact)"
                        @new-operation="onNewOperation($event)"
                        transformRootId="root"
                        v-for="artefact in placedArtefacts"
                        :image_artefact="artefact"
                        :key="artefact.id"
                        :disabled="isArtefactDisabled(artefact)"
                        :selected="isArtefactSelected(artefact)"
                        :scaleFactor="zoomLevel"
                        :withRois="displayRois"
                        :displayText="displayText"
                        :reconstructedText="displayReconstructedText"
                    />
                </g>
            </svg>
        </zoomer>
    </div>
</template>

<!-- <script src="https://unpkg.com/vue-toasted"></script>-->
<script lang="ts">
import { Component, Vue, Emit } from 'vue-property-decorator';
import Waiting from '@/components/misc/Waiting.vue';
import Zoomer, { ZoomEventArgs } from '@/components/misc/zoomer.vue';
import { ScrollEditorParams } from '../artefact-editor/types';
import { BoundingBox } from '@/utils/helpers';
import { ImageSetting } from '@/components/image-settings/types';
import { Artefact } from '@/models/artefact';
import ArtefactImageGroup from './artefact-image-group.vue';
import ArtefactToolbox from './artefact-toolbox.vue';
import { Draggable, DraggableValue } from './drag-directive';
import { ScrollEditorOperation } from './operations';
import { ScrollEditorState } from '@/state/scroll-editor';
import { ArtefactTextFragmentData } from '@/models/text';

import { ScriptData, GlyphData } from '@/models/script';

@Component({
    name: 'scroll-area',
    components: {
        Waiting,
        'zoomer': Zoomer,
        'artefact-image-group': ArtefactImageGroup,
        'artefact-toolbox': ArtefactToolbox,
    },
    directives: {
        Draggable,
    },
})
export default class ScrollArea extends Vue {
    private imageSettings!: ImageSetting;
    private boundingBox = new BoundingBox(1, 1);
    private draggableOptions: DraggableValue = {};

    public selectArtefact(artefact: Artefact | undefined) {
        this.$emit('onSelectArtefact', artefact);
    }

    private created() {
        this.$state.eventBus.on('select-artefact', (art: Artefact) =>
            this.selectArtefact(art)
        );
    }


    private destroyed() {
        this.$state.eventBus.off('select-artefact');
    }

    private async mounted() {
        this.draggableOptions.handle = this.$refs.handleTools as HTMLElement;
        this.draggableOptions.boundingElement = this.$refs
            .scrollArea as HTMLElement;
        // Prepare ROIs of placed artefacts
        await this.placedArtefacts.forEach(async (artefact: Artefact) => {
            await this.$state.prepare.artefact(artefact.editionId, artefact.id);
            await Promise.all(
                artefact.textFragments.map((tf: ArtefactTextFragmentData) =>
                    this.$state.prepare.textFragment(artefact.editionId, tf.id)
                )
            );
        });

    }

    private get scrollEditorState(): ScrollEditorState {
        return this.$state.scrollEditor;
    }

    private get displayRois(): boolean {
        return this.scrollEditorState.displayRois;
    }
    private get displayText(): boolean {
        return this.scrollEditorState.displayText;
    }

    private get displayReconstructedText(): boolean {
        return this.scrollEditorState.displayReconstructedText;
    }
    private get params() {
        return this.scrollEditorState.params || new ScrollEditorParams();
    }

    public get selectedGroup() {
        return this.scrollEditorState.selectedGroup;
    }

    public get selectedArtefact() {
        return this.scrollEditorState.selectedArtefact;
    }

    private isArtefactSelected(artefact: Artefact): boolean {
        if (this.selectedArtefact) {
            return this.selectedArtefact === artefact;
        }
        if (this.selectedGroup) {
            return this.selectedGroup.artefactIds.includes(artefact.id);
        }
        return false;
    }

    private isArtefactDisabled(artefact: Artefact): boolean {
        const artefactGroup = this.getArtefactGroup(artefact);
        if (this.selectedGroup) {
            return (
                this.params.mode === 'manageGroup' &&
                !!artefactGroup &&
                artefactGroup.groupId !== this.selectedGroup.groupId
            );
        }
        return false;
    }

    private get edition() {
        return this.$state.editions.current!;
    }

    private get artefacts() {
        return this.$state.artefacts.items || [];
    }

    private getArtefactGroup(artefact: Artefact) {
        return this.edition!.artefactGroups.find(
            (x) =>
                artefact &&
                x.artefactIds.includes(artefact!.id) &&
                x.artefactIds.length > 1
        );
    }

    private get actualWidth(): number {
        return this.edition.metrics.width * this.edition.ppm * this.zoomLevel;
    }

    private get actualHeight(): number {
        return this.edition.metrics.height * this.edition.ppm * this.zoomLevel;
    }

    private get actualXOrigin(): number {
        return this.edition.metrics.xOrigin * this.edition.ppm * this.zoomLevel;
    }

    private get actualYOrigin(): number {
        return this.edition.metrics.yOrigin * this.edition.ppm * this.zoomLevel;
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
        return (this.params && this.params.zoom) || 1;
    }

    private onNewZoom(event: ZoomEventArgs) {
        this.params.zoom = parseFloat(event.zoom.toString());
    }

    private get transform(): string {
        const zoom = `scale(${this.zoomLevel})`;
        return zoom;
    }

    private get currentScript(): ScriptData | undefined {
        return this.$state.editions.current!.script;
    }

    private get scriptGlyphs(): { [key: string]: GlyphData } | null  {
          return this.$state.editions.current!.script?.glyphs || null;
    }

    private get placedArtefacts() {
        return this.artefacts
            .filter((x) => x.isPlaced && x.inViewport)
            .sort((a, b) => (a.placement.zIndex > b.placement.zIndex ? 1 : -1));
    }

    private onNewOperation(op: ScrollEditorOperation) {
        this.newOperation(op);
    }

    private onSaveGroup() {
        this.$emit('onSaveGroupArtefacts');
    }
    private cancelGroup() {
        this.$emit('onCancelGroup');
    }
    private manageGroup() {
        this.$emit('onManageGroup');
    }

    private onScrollClick(event: MouseEvent) {
        this.scrollEditorState.selectGroup(undefined);
    }

    private onMouseMove(event: MouseEvent) {
        this.scrollEditorState.pointerPosition.x = event.offsetX;
        this.scrollEditorState.pointerPosition.y = event.offsetY;
    }

    @Emit()
    private newOperation(op: ScrollEditorOperation) {
        return op;
    }
}
</script>

<style lang="scss">
#the-scroll {
    background: #7bb6e0;
}

#outer {
    margin-left: 30px;
    margin-top: 30px;
    width: fit-content;
}
.handle-tools {
    width: 16px;
    height: 22px;
    background: #ccc;
    text-align: center;
    cursor: move;
}


.sign {
    fill: inherit;
    stroke: inherit;
}

.display-letters {
    font-family: 'scroll_hebrew';
     stroke-width: 1px;
     stroke: white;
    fill: black;
    font-size: 2px;
    font-weight: 800;
}
</style>
