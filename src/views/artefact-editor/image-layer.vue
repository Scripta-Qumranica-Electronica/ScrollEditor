<template>
    <g>
      <defs>
        <path id="Clip-path" v-if="clippingMask" :d="this.clippingMask.svg"></path>
        <clipPath id="Clipping-outline">
          <use stroke="none" fill="black" fill-rule="evenodd" xlink:href="#Clip-path"></use>
        </clipPath>
      </defs>
      <g pointer-events="none">
        <image v-for="imageSetting in visibleImageSettings"
              :key="'svg-image-' + imageSetting.image.url"
              class="clippedImg"
              draggable="false"
              :xlink:href="imageSetting.image.getFullUrl(100 / $render.scalingFactors.image)"
              :width="width"
              :height="height"
              :opacity="imageSetting.opacity"
              :transform="`translate(${boundingBox.x} ${boundingBox.y})`"
              ></image>
      </g>
      <!-- <use class="pulsate" v-if="clippingMask && !params.clipMask" stroke="blue" fill="none" fill-rule="evenodd" stroke-width="2" xlink:href="#Clip-path"></use>  -->
    </g>
</template>

<script lang="ts">
import Vue from 'vue';
import { wktPolygonToSvg } from '@/utils/VectorFactory';
import { ImageStack } from '@/models/image';
import { Polygon } from '@/utils/Polygons';
import { SingleImageSetting } from '../../components/image-settings/types';
import { BaseEditorParams } from '@/models/editor-params';
import { BoundingBox } from '@/utils/helpers';

export default Vue.extend({
  name: 'image-layer',
  props: {
    width: Number,
    height: Number,
    params: Object as () => BaseEditorParams,
    editable: Boolean,
    clippingMask: Object as () => Polygon,
    boundingBox: Object as () => BoundingBox,
  },
  data() {
    return {
    };
  },
  computed: {
    fullImageMask(): string {
      return `M0 0L${this.width} 0L${this.width} ${this.height}L0 ${this.height}`;
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
</style>
