<template>
    <g>
        <polygon v-for="(pts, index) in points" :key=index
            :points="pts"
            :class="{ selected, editable }"
            :style="additionalStyle"
        />
    </g>
</template>

<script lang="ts">
import { Component, Prop, Vue, Watch } from 'vue-property-decorator';
import { svgPathToPoints } from '@/utils/VectorFactory';
import { ImagedObjectEditorParams } from './types';
import { ImageStack } from '@/models/image';
import { Polygon } from '@/utils/Polygons';
import { SingleImageSetting } from '../../components/image-settings/types';
import { Artefact } from '@/models/artefact';

@Component({
    name: 'artefact-layer',
})
export default class ArtefactLayer extends Vue {
    @Prop() public readonly width!: number;
    @Prop() public readonly height!: number;
    @Prop() public readonly artefact!: Artefact;
    @Prop() public readonly color!: string;
    @Prop() public readonly editable!: boolean;
    @Prop() public readonly selected!: boolean;

    private get additionalStyle() {
        return `stroke: ${this.color}; fill: ${this.color}`;
    }

    private get points(): string[] {
        // A polygon may be actually several polygons, signified by multiple M operations in the svg.
        // These need to be broken into several <polygon> tags
        const fullSvg = this.artefact.mask.polygon.svg;
        const parts = fullSvg.split('M');
        if (parts.length < 2 || parts[0].length !== 0) {
            console.warn('Polygon does not start with an M!');
        }

        // Skip the first part, which is empty
        parts.shift();
        const svgs = parts.map((p) => 'M' + p);  // Add the M
        const points = svgs.map((svg) => svgPathToPoints(svg));

        return points;
    }
    private get polygon() {
        return this.artefact.mask.polygon;
    }
}
</script>

<style lang="scss" scoped>
svg {
    max-height: initial;
}

polygon {
    stroke-width: 1;
    fill: transparent;
    fill-opacity: 0.2;
}

polygon.selected {
    stroke-width: 2;
    fill-opacity: 0.4;
    stroke: skyblue !important;
    animation: pulsate 3s ease-out;
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
