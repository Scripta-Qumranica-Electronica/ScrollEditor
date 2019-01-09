<template>
  <div id="image-menu">
    <section>
      <h5>Artefacts</h5>
      <ul class="list">
        <li v-for="art in fragment.artefacts" :key="art.id">
          <span :class="{ selected: art===artefact }">{{ art.name }}</span>
        </li>
      </ul>
      <b-button>New</b-button>
    </section>
    <section>
      <h5>Images</h5>
      <single-image-setting v-for="imageType in fragment.recto.availableImageTypes" :key="imageType" 
                            :type="imageType" :settings="params.imageSettings[imageType]" @change="onImageSettingChanged(imageType, $event)">
      </single-image-setting>
    </section>
    <section>
      <!-- zoom -->
      <div class="row">
        <div class="col-5">
          Zoom: {{formatTooltip()}}
        </div>
        <div class="col">          
          <b-form-input ref="zoomRef" type="range" min="0.1" max="1" step="0.01"  v-model="zoom"></b-form-input> <!-- v-b-tooltip.hover :title="formatTooltip()"-->
        </div>
      </div>
    </section>
    <section>
      <b-form-checkbox v-model="mask">Mask</b-form-checkbox>
    </section>
    <section>
      <b-button-group>
        <!-- <b-button v-for="mode in ['draw', 'erase']" :key="mode" :value="mode" v-model="draw">{{ mode }}</b-button> -->
        <b-button v-for="mode in [{name: 'Draw', val:'DRAW'}, {name: 'Erase', val: 'ERASE'}]" :key="mode.val" @click="onDrawChanged(mode.val)">{{ mode.name }}</b-button>
      </b-button-group>
    </section>
    <section>
      <b-button @click="save()">Save</b-button>&nbsp;
      <b-button @click="reset()">Reset</b-button>
    </section>    
  </div>
<!--  <el-row 
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
  </el-row> -->
</template>

<script lang="ts">
import Vue from 'vue';
import { Fragment } from '@/models/fragment';
import { Artefact } from '@/models/artefact';
import { EditorParams, DrawingMode, EditorParamsChangedArgs, SingleImageSetting } from './types';
import SingleImageSettingComponent from './SingleImageSetting.vue';
/**
 * This component has a lot of emit functions.  Perhaps it will be better
 * to create a modular container that holds this menu and the possible
 * image view modules that can accompany it.  If we want the menu to be
 * a component, however, I see no way around using these emit functions.
 *
 * The props `artefactEditable` and `roiEditable` are switches that allow
 * the parent component to turn on/off certain menu functionality.
 */
export default Vue.extend({
  name: 'image-menu',
  components: {
    'single-image-setting': SingleImageSettingComponent,
  },
  props: {
    fragment: Fragment,
    artefact: Artefact,
    editable: Boolean,
    params: EditorParams,
  },
  data() {
    return {

    };

  },
  watch: {
    zoom(newValue, oldValue): any {
      console.log('zoom changed', newValue, oldValue);
        // This callback will be called when zoom changes
        // console.log("zoom ref", (this.$refs.zoomRef as any));

        // (this.$refs.zoomRef as any).tooltip('hide')
        //  .attr('data-original-title', this.formatTooltip())
        //   .tooltip('fixTitle')
        //   .tooltip('show');
    }
  },
  computed: {
    zoom: {
      get(): number {
        return this.params.zoom;
      },
      set(val: number) {
        this.params.zoom = val;
        this.notifyChange('zoom', val);
      }
    },
    mask: {
      get(): boolean {
        return this.params.clipMask;
      },
      set(val: boolean) {
        this.params.clipMask = val;
        this.notifyChange('clipMask', val);
      }
    }, /*
    draw: {
      get(): DrawingMode {
        return (this as any).params.drawingMode;
      },
      set(val: string) {
        let mode;
        if (val === 'draw') {
          mode = DrawingMode.DRAW;
        } else if (val === 'erase') {
          mode = DrawingMode.ERASE;
        } else {
          console.error('Invalid drawing mode ', val);
          return;
        }
        (this as any).params.drawingMode = mode;
        this.notifyChange('drawingMode', mode);
      }
    },*/
  },
  methods: {
    onImageSettingChanged(imageType: string, settings: SingleImageSetting) {
      this.params.imageSettings[imageType] = settings;
      this.notifyChange('imageSettings', this.params.imageSettings);
    },
    onDrawChanged(val: DrawingMode) {
        const mode = DrawingMode[val];
        (this as any).params.drawingMode = mode;
        this.notifyChange('drawingMode', mode);
    },
    notifyChange(paramName: string, paramValue: any) {
      const args = {
        property: paramName,
        value: paramValue,
        params: this.params,
      } as EditorParamsChangedArgs;
      this.$emit('paramsChanged', args);
      console.debug(`Property ${paramName} changed to ${JSON.stringify(paramValue)}`);
    },
    formatTooltip(): string {
      return (this.zoom * 100).toFixed(0) + '%';
    },
    save() {
      this.$emit('save', this.artefact.mask);
    },
    reset() {
      this.$emit('reset');
    }
    /*setOpacity(image, value) {
      this.$emit('opacity', image, value)
    },
    toggleVisible(image) {
      this.$emit('visible', image)
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
    }, */
  },
  filters: {
    /*formatImageType(value) {
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
    }, */
  },
});
</script>

<style lang="scss" scoped>
ul.list {
  list-style: none;
}
span.selected {
  font-weight: bold;
}
section {
  margin-bottom: 20px;
}
</style>
