<template>
    <svg    ref="roiSvg"
            :width="actualWidth"
            :height="actualHeight"
            :viewbox="'0 0 ' + actualWidth + ' ' + actualHeight">
    <g :transform="`${rotateTransform})`">
      <defs>
        <path id="Full-clip-path" :d="fullImageMask"></path>  <!-- No scaling transform, since fullImageMask is already scaled -->
        <clipPath id="Full-clipping-outline">
          <use stroke="none" fill="black" fill-rule="evenodd" xlink:href="#Full-clip-path"></use>
        </clipPath>
        <path id="Clip-path" v-if="clippingMask" :d="this.clippingMask.svg" :transform="pathTransform"></path>
        <clipPath id="Clipping-outline">
          <use stroke="none" fill="black" fill-rule="evenodd" xlink:href="#Clip-path"></use>
        </clipPath>
      </defs>
      <g pointer-events="none" :clip-path="params.clipMask ? 'url(#Clipping-outline)' : 'url(#Full-clipping-outline)'">
        <image v-for="imageSetting in imageSettings" 
              :key="'svg-image-' + imageSetting.image.url"
              class="clippedImg" 
              draggable="false" 
              :xlink:href="imageSetting.image.getFullUrl(100 / $render.scalingFactors.image)"
              :width="actualWidth"
              :height="actualHeight"
              :opacity="imageSetting.opacity"
              :visibility="imageSetting.visible ? 'visible' : 'hidden'"></image>
      </g>
      <use class="pulsate" v-if="clippingMask && !params.clipMask" stroke="blue" fill="none" fill-rule="evenodd" stroke-width="2" xlink:href="#Clip-path"></use> 
    </g>
  </svg>
</template>

<script lang="ts">
import Vue from 'vue';
import { wktPolygonToSvg } from '@/utils/VectorFactory';
import { Fragment } from '@/models/fragment';
import { EditorParams, SingleImageSetting } from './types';
import { ImageSet } from '@/models/image';
import { Polygon } from '@/utils/Polygons';

export default Vue.extend({
  name: 'roi-canvas',
  props: {
    width: Number,
    height: Number,
    fragment: Fragment,
    params: EditorParams,
    editable: Boolean,
    side: {
      type: Object as () => ImageSet,
    },
    clippingMask: Polygon,
  },
  data() {
    return {
    };
  },
  computed: {
    scale(): number {
      return 1;
    },
    fullImageMask(): string {
      return `M0 0L${this.actualWidth} 0L${this.actualWidth} ${this.actualHeight}L0 ${this.actualHeight}`;
    },
    // zoomLevel(): number {
    //   // Lot of the old code uses zoomLevel
    //   return this.params.zoom;
    // },
    actualWidth(): number {
      return this.width / this.$render.scalingFactors.image;
    },
    actualHeight(): number {
      return this.height / this.$render.scalingFactors.image;
    },
    rotateTransform(): string {
      return `rotate(${this.params.rotationAngle} ${this.actualWidth / 2} ${this.actualHeight / 2}`;
    },
    pathTransform(): string {
      const transform = 'scale(0.5)'; // `scale(${this.scale / this.$render.scalingFactors.image})`;
      console.log('pathTransform is ', transform);
      return transform;
    },
    imageSettings(): SingleImageSetting[] {
      const values = Object.keys(this.params.imageSettings).map((key) => this.params.imageSettings[key]);
      return values;
    }
  },
  methods: {
  },
});
</script>

<style lang="scss" scoped>
svg {
  max-height: initial;
}

use.pulsate {
  stroke: skyblue;
  animation: pulsate 3s ease-out;
  animation-iteration-count: infinite;
}

@keyframes pulsate {
  0% {
    opacity: 0.4;
    stroke-width: 3;
  }
  50% {
    opacity: 1;
    stroke-width: 5;
  }
  100% {
    opacity: 0.4;
    stroke-width: 3;
  }
}
</style>
