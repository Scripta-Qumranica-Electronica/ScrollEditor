<template>
    <svg    ref="roiSvg"
            :width="actualWidth"
            :height="actualHeight"
            :viewbox="'0 0 ' + actualWidth + ' ' + actualHeight">
    <g>
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
        <image v-for="imageSetting in visibleImageSettings"
              :key="'svg-image-' + imageSetting.image.url"
              class="clippedImg" 
              draggable="false"
              :xlink:href="imageSetting.image.getFullUrl(100 / $render.scalingFactors.image)"
              :width="actualWidth"
              :height="actualHeight"
              :opacity="imageSetting.opacity"
              ></image>
      </g>
      <use class="pulsate" v-if="clippingMask && !params.clipMask" stroke="blue" fill="none" fill-rule="evenodd" stroke-width="2" xlink:href="#Clip-path"></use> 
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

export default Vue.extend({
  name: 'roi-canvas',
  props: {
    originalImageWidth: Number,
    originalImageHeight: Number,
    params: Object as () => ImagedObjectEditorParams,
    editable: Boolean,
    clippingMask: Object as () => Polygon,
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
    actualWidth(): number {
      return this.originalImageWidth / this.$render.scalingFactors.image;
    },
    actualHeight(): number {
      return this.originalImageHeight / this.$render.scalingFactors.image;
    },
    rotateTransform(): string {
      return `rotate(${this.params.rotationAngle} ${this.actualWidth / 2} ${this.actualHeight / 2}`;
    },
    pathTransform(): string {
      const transform = 'scale(0.5)'; // `scale(${this.scale / this.$render.scalingFactors.image})`;
      return transform;
    },
    imageSettings(): SingleImageSetting[] {
      const values = Object.keys(this.params.imageSettings).map((key) => this.params.imageSettings[key]);
      return values;
    },
    visibleImageSettings(): SingleImageSetting[] {
      return this.imageSettings.filter((image) => image.visible);
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
