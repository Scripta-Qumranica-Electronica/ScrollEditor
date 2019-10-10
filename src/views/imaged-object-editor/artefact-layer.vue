<template>
    <svg :width="width" :height="height" :viewbox="'0 0 ' + width + ' ' + height">
        <g>
            <polygon
                :points="polygonPoints"
                :class="{ selected, editable }"
                :style="additionalStyle"
            />
        </g>
    </svg>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import { wktPolygonToSvg } from '@/utils/VectorFactory';
import { ImagedObjectEditorParams } from './types';
import { ImageStack } from '@/models/image';
import { Polygon } from '@/utils/Polygons';
import { SingleImageSetting } from '../../components/image-settings/types';
import { Artefact } from '@/models/artefact';

@Component({
    name: 'image-layer',
})
export default class ImageLayer extends Vue {
    @Prop() public readonly width!: number;
    @Prop() public readonly height!: number;
    @Prop() public readonly artefact!: Artefact;
    @Prop() public readonly color!: string;
    @Prop() public readonly editable!: boolean;
    @Prop() public readonly selected!: boolean;

    private get polygonPoints(): string | null {
        return this.artefact.mask.polygon.points;
    }

    private get additionalStyle() {
        return `stroke: ${this.color}; fill: ${this.color}`;
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
}
</style>
