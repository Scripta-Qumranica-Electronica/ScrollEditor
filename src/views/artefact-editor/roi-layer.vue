<template>
    <g>
        <path
            v-for="roi in rois"
            :key="roi.id"
            :d="roi.shape.svg"
            :transform="`translate(${roi.position.x} ${roi.position.y})`"
            :class="{ shine: roi.shiny, selected: roi === selected }"
            @click="onPathClicked(roi)"
            vector-effect="non-scaling-stroke"
        />
    </g>
</template>

<script lang="ts">
import { Component, Prop, Vue, Emit } from 'vue-property-decorator';
import { InterpretationRoi } from '@/models/text';

@Component({
    name: 'roi-layer',
    components: {}
})
export default class RoiLayer extends Vue {
    @Prop() public rois!: Iterator<InterpretationRoi>;
    @Prop({
        default: null
    })
    public selected!: InterpretationRoi | null;

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
path {
    stroke-width: 2;
    fill: transparent;
    stroke: darkslategray;
}

path.shiny {
    stroke: skyblue !important;
    animation: pulsate 2s ease-out;
    animation-iteration-count: infinite;
}

path.selected {
    stroke: #FFFF99;
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
