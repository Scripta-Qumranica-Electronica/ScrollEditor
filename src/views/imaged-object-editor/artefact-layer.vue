<template>
    <g>
        <polygon
            :points="polygon.points"
            :class="{ selected, editable }"
            :style="additionalStyle"
        />
    </g>
</template>

<script lang="ts">
import { Component, Prop, Vue, Watch } from 'vue-property-decorator';
import { wktPolygonToSvg } from '@/utils/VectorFactory';
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
