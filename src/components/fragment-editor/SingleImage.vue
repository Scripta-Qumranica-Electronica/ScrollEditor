<template>
  <div 
    class="single-image-pane" 
    :class='{fullscreen}'
    style="{width: 100%; height: 100%;}">
    <image-menu
      :corpus="corpus"
      :scrollVersionID="scrollVersionID"
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
    </image-menu>
    <div style="{width: 100%; height: calc(100% - 30px); overflow: auto; position: relative;}">
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
      </artefact-canvas>
    </div>
  </div>
</template>

<script>
import ImageMenu from './ImageMenu.vue'
import RoiCanvas from './RoiCanvas.vue'
import ArtefactCanvas from './ArtefactCanvas.vue'
import { wktPolygonToSvg, svgPolygonToWKT } from '../utils/VectorFactory'

export default {
  props: {
    corpus: {
      required: true,
      type: Object,
    },
  },
  components: {
    'image-menu': ImageMenu,
    'roi-canvas': RoiCanvas,
    'artefact-canvas': ArtefactCanvas,
  },
  data() {
    return {
      scrollVersionID: undefined,
      imageElements: [],
      selectedImageUrls: [],
      filenames: [],
      masterImage: {},
      imageShrink: 2,
      artefact: undefined,
      artName: '',
      zoom: 0.5,
      scale: 0.2,
      selectedImage: undefined,
      viewMode: 'NONE',
      drawingMode: 'draw',
      brushCursorSize: 20,
      clipMask: undefined,
      firstClipMask: undefined,
      clippingOn: false,
      lock: true,
      imageSettings: {},
      fullscreen: false,
    }
  },
  methods: {
    fetchImages(id) {
      this.$store.commit('addWorking')
      this.corpus.images
        .populate({
          scroll_version_id: this.$route.params.scrollVersionID,
          image_catalog_id: id,
        })
        .then(res => {
          this.$store.commit('delWorking')
          this.filenames = this.corpus.imageReferences.get(id >>> 0).images
          this.filenames.forEach(key => {
            if (this.corpus.images.get(key).is_master) {
              this.$set(this.imageSettings, key, { visible: true, opacity: 1.0 })
              this.masterImage = this.corpus.images.get(key)
            } else {
              this.$set(this.imageSettings, key, { visible: false, opacity: 1.0 })
            }
          })
          this.$store.commit('addWorking')
          this.corpus.artefacts
            .populate({
              scroll_version_id: this.$route.params.scrollVersionID,
              image_catalog_id: id,
            })
            .then(res1 => {
              this.$store.commit('delWorking')
            })
            .catch(err => {
              this.$store.commit('delWorking')
              console.error(err)
            })
        })
        .catch(err => {
          this.$store.commit('delWorking')
          console.error(err)
        })
    },
    setClipMask(svgMask) {
      this.corpus.artefacts.updateArtefactShape(
        this.$route.params.artID,
        this.$route.params.scrollVersionID,
        svgMask
      )
    },
    toggleMask() {
      if (
        this.corpus.artefacts.get(this.$route.params.artID, this.$route.params.scrollVersionID) &&
        this.corpus.artefacts.get(this.$route.params.artID, this.$route.params.scrollVersionID).mask
      ) {
        this.clippingOn = !this.clippingOn
      }
    },
    delSelectedRoi() {
      this.$refs.currentRoiCanvas.deleteSelectedRoi()
    },
    setOpacity(idx, val) {
      this.$set(this.imageSettings[idx], 'opacity', val)
    },
    toggleVisible(idx) {
      this.$set(this.imageSettings[idx], 'visible', !this.imageSettings[idx].visible)
    },
    toggleDrawingMode() {
      this.drawingMode = this.drawingMode === 'draw' ? 'erase' : 'draw'
    },
    changeBrushSize(value) {
      this.brushCursorSize = value
    },
    changeViewMode(value) {
      this.viewMode = value
    },
    changeZoom(value) {
      this.zoom = value
    },
    /**
     * Show the editor in full screen mode
     */
    toggleFullScreen() {
      this.fullscreen = !this.fullscreen
    },
  },
  watch: {
    $route(to, from) {
      // TODO maybe rethink this to avoid the case where
      // we have an artID but no imageID

      // Fetch images for image ID if it has changed
      if (to.params.imageID !== '~' && to.params.imageID !== from.params.imageID) {
        this.fetchImages(this.$route.params.imageID)
        this.artefact = undefined
        this.firstClipMask = this.clipMask = undefined
        if (to.params.artID === '~') {
          this.clippingOn = false
        }
      }

      // Load new artefact ID if there is one
      if (
        (to.params.artID !== '~' && to.params.artID !== from.params.artID) ||
        to.params.scrollVersionID !== from.params.scrollVersionID
      ) {
        this.viewMode = 'ART'
        this.artefact = ~~to.params.artID
        this.scrollVersionID = ~~to.params.scrollVersionID
        this.firstClipMask = this.clipMask = this.corpus.artefacts.get(
          this.artefact,
          this.scrollVersionID
        )
          ? wktPolygonToSvg(this.corpus.artefacts.get(this.artefact, this.scrollVersionID).mask)
          : undefined
        this.lock = false
      }
    },
  },
  filters: {
    formatImageType(value) {
      let formattedString = ''
      switch (value) {
        case 0:
          formattedString += 'Full Color'
          break
        case 1:
          formattedString += '940nm'
          break
        case 2:
          formattedString += '940nm RL'
          break
        case 3:
          formattedString += '940nm RR'
          break
      }
      return formattedString
    },
  },
  created() {
    this.brushCursorSize = 20
  },
}
</script>

<style lang="scss" scoped>
@import '~sass-vars';
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
