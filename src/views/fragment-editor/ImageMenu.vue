<template>
  <el-row 
    class="single-image-pane-menu" 
    :gutter="1" 
    type="flex" 
    align="middle">
    <el-col :span="5">
      <el-select 
        class="image-select-entry" 
        :value="selectedImage"
        @input="selectedImage = []"
        placeholder="Select Images" 
        multiple size="mini">
        <el-option
          v-for="image of images"
          :key="'selector-' + corpus.images.get(image).filename"
          :label="corpus.images.get(image).type | formatImageType"
          :value="image">
          <el-row
            :gutter="1" 
            type="flex" 
            justify="left"
            align="middle">
            <el-col :span="2">
              <span class="drag-handle image-select-entry" style="float: left">☰</span>
            </el-col>
            <el-col :span="8">
              <span class="image-select-entry">
                &nbsp;{{corpus.images.get(image).type | formatImageType}}
              </span>
            </el-col>
            <el-col :span="10">
              <input
              class="image-select-entry"
              type="range"
              min="0"
              max="1.0"
              step="0.001"
              @input="setOpacity(image, $event.target.value)"/>
            </el-col>
            <el-col :span="4">
              <span>
                <i class="fa fa-eye image-select-entry"
                  :style="{color: imageSettings[image].visible ? 'green' : 'red'}"
                  @click="toggleVisible(image)">
                </i>
              </span>
            </el-col>
          </el-row>
        </el-option>
      </el-select>
    </el-col>
    <el-col :span="1">
      <span class="label">Zoom</span>
    </el-col>
    <el-col :span="4">
      <el-slider
        class="image-slider"
        v-model="changeZoom"
        :min="0.1"
        :step="0.01"
        :max="1.0"
        :format-tooltip="formatTooltip">
      </el-slider>
    </el-col>
    <el-col v-if="roiEditable && !scrollLocked" v-show="artefact"  :span="4">
      <el-radio-group v-model="changeViewMode" size="mini">
        <el-radio-button label="ROI">{{$i18n.str('ROI')}}</el-radio-button>
        <el-radio-button label="ART">{{$i18n.str('ART')}}</el-radio-button>
      </el-radio-group>
    </el-col>
    <el-col v-show="artefact"  :span="3">
      <el-button @click="toggleMask" size="mini">Mask</el-button>
    </el-col>
    <el-col v-if="roiEditable && !scrollLocked" v-show="viewMode === 'ROI' && artefact" :span="3">
      <el-button @click="delSelectedRoi" size="mini">Del ROI</el-button>
    </el-col>
    <el-col v-if="artefactEditable && !scrollLocked" v-show="viewMode === 'ART' && artefact" :span="3">
      <el-button
              @click="toggleDrawingMode"
              :type="drawingMode === 'draw' ? 'primary' : 'warning'"
              size="mini">
        {{drawingMode === 'draw' ? 'Draw' : 'Erase'}}
      </el-button>
    </el-col>
    <el-col v-if="artefactEditable && !scrollLocked" v-show="viewMode === 'ART' && artefact" :span="4">
      <el-slider
        class="image-slider"
        v-model="changeBrushSize"
        :min="0"
        :max="200"
        :step="1">
      </el-slider>
    </el-col>
    <el-col :span="1">
      <el-button 
        id="single-image-fullscreen" 
        @click="toggleFullscreen" 
        v-bind:title="$i18n.str('Editor.Fullscreen')"
        size="mini">
        <i class="fa fa-arrows-alt" aria-hidden="true"></i>
      </el-button>
    </el-col>
  </el-row>
</template>

<script>
/**
 * This component has a lot of emit functions.  Perhaps it will be better
 * to create a modular container that holds this menu and the possible
 * image view modules that can accompany it.  If we want the menu to be
 * a component, however, I see no way around using these emit functions.
 *
 * The props `artefactEditable` and `roiEditable` are switches that allow
 * the parent component to turn on/off certain menu functionality.
 */
export default {
  props: {
    corpus: undefined,
    scrollVersionID: undefined,
    images: undefined,
    imageSettings: undefined,
    artefact: undefined,
    zoom: undefined,
    viewMode: undefined,
    artefactEditable: undefined,
    roiEditable: undefined,
    brushCursorSize: undefined,
  },
  data() {
    return {
      drawingMode: 'draw',
      selectedImage: [],
    }
  },
  computed: {
    changeBrushSize: {
      get() {
        return this.brushCursorSize
      },
      set(val) {
        this.$emit('changeBrushSize', val)
      },
    },
    changeViewMode: {
      get() {
        return this.viewMode
      },
      set(val) {
        this.$emit('changeViewMode', val)
      },
    },
    changeZoom: {
      get() {
        return this.zoom
      },
      set(val) {
        this.$emit('changeZoom', val)
      },
    },
    scrollLocked() {
      return this.artefact ? this.$store.getters.isScrollLocked(this.scrollVersionID) : false
    },
  },
  methods: {
    setOpacity(image, value) {
      this.$emit('opacity', image, value)
    },
    toggleVisible(image) {
      this.$emit('visible', image)
    },
    formatTooltip() {
      return (this.zoom * 100).toFixed(2) + '%'
    },
    toggleDrawingMode() {
      this.$emit('drawingMode')
      this.drawingMode = this.drawingMode === 'draw' ? 'erase' : 'draw'
    },
    toggleMask() {
      this.$emit('toggleMask')
    },
    delSelectedRoi() {
      this.$emit('delSelectedRoi')
    },
    toggleFullscreen() {
      this.$emit('fullscreen')
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
}
</script>

<style lang="scss" scoped>
.single-image-pane-menu {
  width: 100%;
  height: 32px; // Should be 30px, but 32px looks better
  max-height: 32px; // Should be 30px, but 32px looks better
  background: #dedede;
  margin-left: 0px !important; // Not sure why I have to do this, there is bleed through somewhere.
  margin-right: 0px !important; // Not sure why I have to do this, there is bleed through somewhere.
  user-select: none;
}
.image-select-entry {
  width: 100%;
  user-select: none;
}
.label {
  font-size: small;
}
.image-slider {
  padding-left: 20px;
  padding-right: 20px;
}
i.image-select-entry {
  padding-left: 6px;
}
</style>
