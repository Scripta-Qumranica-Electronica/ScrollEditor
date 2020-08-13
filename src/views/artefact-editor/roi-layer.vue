<template>
    <g>
        <path
            v-for="roi in rois"
            :key="roi.id"
            :d="roi.shape.svg"
            :transform="`translate(${roi.position.x} ${roi.position.y})`"
            :class="{ shine: roi.shiny, selected: isSelectedRoi(roi), highlighted: highlighted(roi) }"
            @click="onPathClicked(roi)"
            vector-effect="non-scaling-stroke"
        />
    </g>
</template>

<script lang="ts">
import { Component, Prop, Vue, Emit, Watch } from 'vue-property-decorator';
import { InterpretationRoi, SignInterpretation } from '@/models/text';
import { i } from 'mathjs';

@Component({
    name: 'roi-layer',
    components: {},
})
export default class RoiLayer extends Vue {
    @Prop() public rois!: Iterator<InterpretationRoi>;

    public highlighted(roi: InterpretationRoi) {
        if (this.si) {
            return roi.signInterpretationId === this.si.signInterpretationId;
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
</style>
