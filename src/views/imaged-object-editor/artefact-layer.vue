<template>
    <svg :width="width"
         :height="height"
         :viewbox="'0 0 ' + width + ' ' + height">
    <g>
        <polygon :points="polygonPoints" :class="{ pulsate: selected && editable }"/>
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
    }
  },
});
</script>

<style lang="scss" scoped>
svg {
  max-height: initial;
}

polygon {
    stroke: black;
    stroke-width: 1;
    fill: transparent;
}

polygon.pulsate {
  fill: skyblue;
  animation: pulsate 3s ease-out;
  animation-iteration-count: infinite;
}

@keyframes pulsate {
  0% {
    opacity: 0.0;
    stroke-width: 3;
  }
  50% {
    opacity: 0.4;
    stroke-width: 5;
  }
  100% {
    opacity: 0.0;
    stroke-width: 3;
  }
}
</style>
