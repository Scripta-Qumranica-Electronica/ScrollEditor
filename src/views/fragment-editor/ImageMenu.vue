<template>
  <div id="image-menu">
    <section>
      <h5>Artefacts</h5>
      <ul class="list">
        <li v-for="art in fragment.artefacts" :key="art.id">
          <span v-if="!renameFlag" :class="{ selected: art===artefact }">{{ art.name }}</span>
          <b-button v-if="!renameFlag && !renaming" @click="openRename()">Rename</b-button>
      
          <input v-if="renameFlag" v-model="art.name" />
          <b-button v-if="!renaming && renameFlag" :disabled="!art.name" @click="rename(art.name)">Rename</b-button>
          <b-button v-if="renaming" disabled class="disable">
            Renaming...<font-awesome-icon icon="spinner" size="1.5x" spin></font-awesome-icon>
          </b-button>
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
      <div class="row">
        <div class="col-5">
          Brush Size: {{brushSize}}
        </div>
        <div class="col">          
          <b-form-input type="range" min="2" max="40" step="1"  v-model="brushSize"></b-form-input>
        </div>
      </div>
    </section>
    <section v-if="artefact.mask">
      <b-form-checkbox v-model="mask">Mask</b-form-checkbox>
    </section>
    <section>
      <b-button @click="onRotateClick(-90)"><font-awesome-icon icon="undo"></font-awesome-icon></b-button>
      <b-button @click="onRotateClick(90)"><font-awesome-icon icon="redo"></font-awesome-icon></b-button>
    </section>
    <section v-if="editable">
      <b-button-group>
        <b-button v-for="mode in [{name: 'Draw', val:'DRAW'}, {name: 'Erase', val: 'ERASE'}]" 
        :key="mode.val" @click="onDrawChanged(mode.val)" 
        :pressed="modeChosen(mode.val)">{{ mode.name }}</b-button>
      </b-button-group>
    </section>
    <section v-if="editable">
      <b-button v-if="!saving" @click="save()">Save</b-button>&nbsp;
      <b-button v-if="saving" disabled class="disable">
        Saving...<font-awesome-icon icon="spinner" size="1.5x" spin></font-awesome-icon>
      </b-button>
      <b-button @click="undo()">Undo</b-button>
      <b-button @click="redo()">Redo</b-button>
    </section>
</div>
</template>

<script lang="ts">
import Vue from 'vue';
import { Fragment } from '@/models/fragment';
import { Artefact } from '@/models/artefact';
// import Waiting from '@/components/misc/Waiting.vue';
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
    // Waiting,
    'single-image-setting': SingleImageSettingComponent,
  },
  props: {
    fragment: Fragment,
    artefact: Artefact,
    editable: Boolean,
    params: EditorParams,
    saving: Boolean,
    renaming: Boolean,
  },
  data() {
    return {
      renameFlag: false,
      errorMessage: '',
    };
  },
  computed: {
    zoom: {
      get(): number {
        return this.params.zoom;
      },
      set(val: any) {
        this.params.zoom = parseFloat(val);
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
    },
    brushSize: {
      get(): number {
        return this.params.brushSize;
      },
      set(val: number) {
        this.params.brushSize = val;
        this.notifyChange('brushSize', val);
      }
    },
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
    onRotateClick(degrees: number) {
      this.params.rotationAngle += degrees;
      this.notifyChange('rotationAngle', this.params.rotationAngle);
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
    modeChosen(val: DrawingMode) {
      return DrawingMode[val].toString() === this.params.drawingMode.toString();
    },
    save() {
      this.$emit('save', this.artefact.mask);
    },
    undo() {
      this.$emit('undo');
    },
    redo() {
      this.$emit('redo');
    },
    rename() {
      this.renameFlag = false;
      this.$emit('rename');
    },
    openRename() {
      this.renameFlag = true;
    },
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
#image-menu {
  height: 94vh;
}
button.disable {
  cursor: not-allowed;
}
button {
  margin-right: 10px;
  margin-left: 10px;
}
</style>
