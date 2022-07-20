<template>
    <g>
      <defs>
        <path id="Full-clip-path" :d="fullImageMask"></path>  <!-- No scaling transform, since fullImageMask is already scaled -->
        <clipPath id="Full-clipping-outline">
          <use stroke="none" fill="black" fill-rule="evenodd" xlink:href="#Full-clip-path"></use>
        </clipPath>
        <path id="Clip-path" v-if="clippingMask" :d="this.clippingMask.svg"></path>
        <clipPath id="Clipping-outline">
          <use stroke="none" fill="black" fill-rule="evenodd" xlink:href="#Clip-path"></use>
        </clipPath>
      </defs>
      <g pointer-events="none" :clip-path="params.background ? 'url(#Full-clipping-outline)' : 'url(#Clipping-outline)'">
        <iiif-image
              v-for="imageSetting in visibleImageSettings"
              :key="'svg-image-' + imageSetting.image.url"
              class="clippedImg"
              draggable="false"
              :image="imageSetting.image"
              :scaleFactor="params.zoom"
              :opacity="imageSetting.normalizedOpacity"
              />
      </g>
      <!-- <use class="pulsate" v-if="clippingMask && !params.clipMask" stroke="blue" fill="none" fill-rule="evenodd" stroke-width="2" xlink:href="#Clip-path"></use>  -->
    </g>
</template>

<script lang="ts">
import { Component, Prop, Emit, Vue } from 'vue-property-decorator';

import { ImagedObjectEditorParams } from './types';
import { Polygon } from '@/utils/Polygons';
import { SingleImageSetting } from '../../components/image-settings/types';
import IIIFImageComponent from '@/components/images/IIIFImage.vue';

@Component({
name: 'image-layer',
  components: {
    'iiif-image': IIIFImageComponent,
  }
})

export default class ImageLayer extends Vue {

  // props
    @Prop() protected width!: number;
    @Prop() protected height!: number;
    @Prop() protected params!: ImagedObjectEditorParams;
                        // Object as () => ImagedObjectEditorParams;
    @Prop() protected editable!: boolean;
    @Prop() protected clippingMask!: Polygon;
                        // Object as () => Polygon;

  // computed

    protected get fullImageMask(): string {
      return `M0 0L${this.width} 0L${this.width} ${this.height}L0 ${this.height}`;
    }

    protected get imageSettings(): SingleImageSetting[] {
      const values = Object.keys(this.params.imageSettings).map((key) => this.params.imageSettings[key]);
      return values;
    }

    protected get visibleImageSettings(): SingleImageSetting[] {
      return this.imageSettings.filter((image) => image.visible);
    }

}

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
