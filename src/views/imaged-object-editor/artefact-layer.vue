<template>
    <svg :width="width"
         :height="height"
         :viewbox="'0 0 ' + width + ' ' + height">
    <g>
        <polygon :points="polygonPoints" :class="{ selected, editable }" :style="additionalStyle"/>
    </g>
  </svg>
</template>

<script lang="ts">
import Vue from 'vue';
import { wktPolygonToSvg } from '@/utils/VectorFactory';
import { ImagedObjectEditorParams } from './types';
import { ImageStack } from '@/models/image';
import { Polygon } from '@/utils/Polygons';
import { SingleImageSetting } from '../../components/image-settings/types';
import { Artefact } from '@/models/artefact';

export default Vue.extend({
  name: 'image-layer',
  props: {
    width: Number,
    height: Number,
    artefact: Object as () => Artefact,
    color: String,
    editable: Boolean,
    selected: Boolean,
  },
  data() {
    return {
    };
  },
  computed: {
    polygonPoints(): string | null {
        return this.artefact.mask.polygon.points;
    },
    additionalStyle() {
      return `stroke: ${this.color}; fill: ${this.color}`;
    }
  },
});
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
