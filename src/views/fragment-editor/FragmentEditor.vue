<template>
  <div class="row">
    <div v-if="waiting" class="col">
      <Waiting></Waiting>
    </div>
    <div v-if="!waiting && fragment" class="row no-gutters">
      <div class="col-xl-2 col-lg-3 col-md-4">
        <!--
        <image-menu
          :corpus="corpus"
          :scrollVersionId="scrollVersionId"
          :images="filenames"
          :imageSettings="imageSettings"
          :artefact="artefact"
          :zoom="zoom"
          :viewMode="viewMode"
          :artefact-editable="true"
          :roi-editable="false"
          :brushCursorSize="brushCursorSize"
          v-on:opacity="setOpacity"
          v-on:changeBrushSize="changeBrushSize"
          v-on:visible="toggleVisible"
          v-on:drawingMode="toggleDrawingMode"
          v-on:toggleMask="toggleMask"
          v-on:delSelectedRoi="delSelectedRoi"
          v-on:changeViewMode="changeViewMode"
          v-on:changeZoom="changeZoom"
          v-on:fullscreen="toggleFullScreen">
        </image-menu>  -->
      </div>
    
      <div class="col">
        <!--
        <roi-canvas class="overlay-image"
                    :width="masterImage.width ? masterImage.width : 0"
                    :height="masterImage.height ? masterImage.height : 0"
                    :zoom-level="zoom"
                    :images="filenames"
                    :image-settings="imageSettings"
                    :divisor="imageShrink"
                    :clipping-mask="$route.params.artID === '~' || !corpus.artefacts.get($route.params.artID, $route.params.scrollVersionID) ? 
                                      undefined : 
                                      corpus.artefacts.get($route.params.artID, $route.params.scrollVersionID).mask"
                    :clip="clippingOn"
                    :corpus="corpus"
                    ref="currentRoiCanvas">
        </roi-canvas>
        <artefact-canvas  class="overlay-canvas"
                          v-show="viewMode === 'ART'"
                          :width="masterImage.width ? masterImage.width / 2 : 0"
                          :height="masterImage.height ? masterImage.height / 2 : 0"
                          :scale="zoom"
                          :draw-mode="drawingMode"
                          :brush-size="brushCursorSize"
                          :divisor="imageShrink"
                          :mask="$route.params.artID === '~' || !corpus.artefacts.get($route.params.artID, $route.params.scrollVersionID) ? 
                                    undefined :
                                    corpus.artefacts.get($route.params.artID, $route.params.scrollVersionID).mask"
                          :locked="lock"
                          :clip="clippingOn"
                          v-on:mask="setClipMask"
                          ref="currentArtCanvas">
        </artefact-canvas> -->
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import Waiting from '@/components/misc/Waiting.vue';
import FragmentService from '@/services/fragment';
import { Fragment } from '@/models/fragment';
import ImageMenu from './ImageMenu.vue';

export default Vue.extend({
  name: 'fragment-editor',
  components: {
    Waiting,
    'image-menu': ImageMenu,
  },
  data() {
    return {
      fragmentService: new FragmentService(this.$store),
      waiting: false,
    };
  },
  computed: {
    fragment(): Fragment {
      return this.$store.state.fragment.fragment;
    },
    scrollVersionId(): number {
      return parseInt(this.$route.params.scrollVersionId);
    }
  },
  async mounted() {
    try {
      this.waiting = true;
      await this.fragmentService.fetchFragmentInfo(
        parseInt(this.$route.params.scrollVersionId),
        parseInt(this.$route.params.fragmentId));
    } finally {
      this.waiting = false;
    }
  }
});
</script>

<style lang="scss" scoped>
// @import '~sass-vars';
.overlay-image {
  position: absolute;
  top: 0;
  left: 0;
  transform-origin: top left;
}
.overlay-canvas {
  position: absolute;
  top: 0;
  left: 0;
  transform-origin: top left;
}
.single-image-pane.fullscreen {
  position: fixed;
  left: 0;
  top: 0;
  width: 100vw;
  height: 100vh;
  z-index: 2000;
  background: #fff;
}
</style>
