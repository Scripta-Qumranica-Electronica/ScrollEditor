<template>
    <g>    
        <template v-for="roi in rois">
            <g
                :key="roi.id"
                :transform="`translate(${roi.position.x} ${roi.position.y})`"
            >
                <path
                    :d="roi.shape.svg"
                    :class="{
                        shine: roi.shiny && withClass,
                        selected: isSelectedRoi(roi) && withClass,
                        highlighted: highlighted(roi) && withClass,
                        highlightedComment:
                            highlightedComment(roi) && withClass,
                    }"
                    @click="onPathClicked(roi)"
                    vector-effect="non-scaling-stroke"
                ></path>
                <text
                    v-if="withLetters"
                    class="reconstructed-letters"
                    :key="roi.id"
                    :y="roi.shape.getBoundingBox().height"
                    font-size="300"
                    >{{ si.character }}</text
                >
            </g>
        </template>
    </g>
</template>

<script lang="ts">
import { Component, Prop, Vue, Emit } from 'vue-property-decorator';
import { InterpretationRoi } from '@/models/text';

@Component({
    name: 'roi-layer',
    components: {},
})
export default class RoiLayer extends Vue {
    @Prop() public rois!: Iterator<InterpretationRoi>;
    @Prop({
        default: false,
    })
    public withLetters!: boolean;

    @Prop({
        default: true,
    })
    public withClass!: boolean;

    public highlighted(roi: InterpretationRoi) {
        if (this.si) {
            return roi.signInterpretationId === this.si.signInterpretationId;
        }
    }
    public highlightedComment(roi: InterpretationRoi) {
        if (roi.signInterpretationId) {
            const si = this.$state.signInterpretations.get(
                roi.signInterpretationId
            );
            return (
                this.artefactEditorState.highlightCommentMode &&
                si &&
                (si.commentary || si.attributes.some((attr) => attr.commentary))
            );
        }
    }

    public isSelectedRoi(roi: InterpretationRoi) {
        return (
            this.selectedInterpretationRoi &&
            this.selectedInterpretationRoi.interpretationRoiId ===
                roi.interpretationRoiId
        );
    }

    public get selectedInterpretationRoi(): InterpretationRoi | null {
        return this.$state.artefactEditor.selectedInterpretationRoi;
    }

    private get si() {
        return this.$state.artefactEditor.singleSelectedSi;
    }

    public get artefactEditorState() {
        return this.$state.artefactEditor;
    }

    private onPathClicked(roi: InterpretationRoi) {
        this.roiClicked(roi);
    }

    @Emit()
    private roiClicked(roi: InterpretationRoi) {
        return roi;
    }
}
</script>

<style lang="scss" scoped>
@import '@/assets/styles/_variables.scss';
@import '@/assets/styles/_fonts.scss';
path {
    stroke-width: 2;
    fill: transparent;
    stroke: $dark-not-select;
}
path.highlighted {
    stroke-width: 2;
    fill: transparent;
    stroke: $red;
}

path.highlightedComment {
    fill: $yellow-select;
    fill-opacity: 0.3;
}

path.shiny {
    stroke: skyblue !important;
    animation: pulsate 2s ease-out;
    animation-iteration-count: infinite;
}

path.selected {
    stroke: $yellow-select;
    stroke-width: 2;
    filter: contrast(200%);
    animation: pulsate 2s ease-out;
    animation-iteration-count: infinite;
}

@keyframes pulsate {
    0% {
        stroke-opacity: 0.4;
    }
    50% {
        stroke-opacity: 1;
    }
    100% {
        stroke-opacity: 0.4;
    }
}
.reconstructed-letters {
    font-family: 'SBL Hebrew';
    stroke-width: 10px;
    stroke: black;
    fill: white;
    font-weight: 800;
}
</style>
