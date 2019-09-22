<template>
  <div>
    <div id="svg-scale">
      <svg
        :viewbox="`0 0 ${actualWidth} ${actualHeight}`"
        :width="actualWidth"
        :height="actualHeight"
      >
        <g>
          <path v-for="sign in signs" :key="sign.signId" :d="sign.polygon.svg" />
        </g>
      </svg>
    </div>
  </div>
</template>

<script lang="ts">
import Vue, { PropOptions } from 'vue';
import { ShapeSign } from './types';
// import AsyncComputed from 'vue-async-computed';

export default Vue.extend({
  props: {
    signs: {
      type: Array,
      default: () => []
    } as PropOptions<ShapeSign[]>,
    selectedSignId: Number,

    originalImageWidth: Number,
    originalImageHeight: Number,
    scale: Number
  },
  data() {
    return {};
  },
  computed: {
    actualWidth(): number {
      return (
        this.originalImageWidth /
        this.scale /
        this.$render.scalingFactors.canvas
      );
    },
    actualHeight(): number {
      return (
        this.originalImageHeight /
        this.scale /
        this.$render.scalingFactors.canvas
      );
    }
  },
  methods: {}
});
</script>

<style lang="scss" scoped>
#svg-scale {
  transform-origin: 0 0;
}
</style>