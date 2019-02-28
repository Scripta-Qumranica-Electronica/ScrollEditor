<template>
  <div id="image-menu" :class="{ 'fixed-header': scrolled }">
    <section>
      <h5>Artefacts</h5>
      <table>
        <tr v-for="art in fragment.artefacts" :key="art.id">
          <td>
            <span v-if="renameInputActive!==art" :class="{ selected: art===artefact }" @click="chooseArtefact(art)" :style="{'color': art.color}">{{ art.name }}</span>
          </td>
          <td>
            <b-button v-if="renameInputActive!==art" class="btn btn-sm" @click="openRename(art)">Rename</b-button>
            <input v-if="renameInputActive===art" v-model="art.name" />
            <b-button v-if="!renaming && renameInputActive===art" class="btn btn-sm" :disabled="!art.name" @click="rename(art)">Rename</b-button>
            <b-button v-if="renameInputActive===art && renaming" disabled class="disable btn btn-sm">
            Renaming...<font-awesome-icon icon="spinner" size="1.5x" spin></font-awesome-icon>
            </b-button>
          </td>
        </tr>
      </table>
      <b-btn v-b-modal.modal="'newModal'" class="btn btn-sm btn-outline">{{ $t('misc.new') }}</b-btn>

      <b-modal id="newModal" 
                 ref="newArtRef"
                 :title="$t('home.newArtefact')"
                 @shown="newModalShown"
                 @ok="newArtefact"
                 :ok-title="$t('misc.create')"
                 :cancel-title="$t('misc.cancel')"
                 :ok-disabled="waiting || !canCreate"
                 :cancel-disabled="waiting">
            <form @submit.stop.prevent="newArtefact">
                <b-form-group :label="$t('home.newArtefactName')"
                              label-for="newArtefactName">
                    <b-form-input ref="newArtefactName"
                                  id="newName" 
                                  v-model="newArtefactName" 
                                  type="text"
                                  @keyup.enter="newArtefact" 
                                  required 
                                  :placeholder="$t('home.newArtefactName')">
                    </b-form-input>
                </b-form-group>
                <p v-if="waiting">
                    {{ $t('home.creatingNewArtefact') }}...
                    <font-awesome-icon icon="spinner" spin></font-awesome-icon>
                </p>
                <p class="text-danger" v-if="errorMessage">{{ errorMessage }}</p>
            </form>
        </b-modal>
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
    <section v-if="editable" v-shortcuts="[
      { shortcut: [ 'arrowright' ], callback: redoModal },
      { shortcut: [ 'arrowleft' ], callback: undoModal },
    ]">
      <b-button v-if="!saving" @click="save()">Save</b-button>&nbsp;
      <b-button v-if="saving" disabled class="disable">
        Saving...<font-awesome-icon icon="spinner" size="1.5x" spin></font-awesome-icon>
      </b-button>
      <b-button @click="undo()">Undo</b-button>
      <b-button @click="redo()">Redo</b-button>

      <b-modal id="undoModal" 
                 ref="undoRef"
                 :title="$t('home.undo')"
                 @shown="undoModalShown"
                 @ok="undo"
                 :ok-title="$t('misc.undo')"
                 :cancel-title="$t('misc.cancel')"
                 :ok-disabled="waiting || !canUndo"
                 :cancel-disabled="waiting">
            <form @submit.stop.prevent="undo">
              <label>....</label>
            </form>
        </b-modal>

    </section>
</div>
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
    saving: Boolean,
    renaming: Boolean,
    renameInputActive: Artefact,
  },
  data() {
    return {
      errorMessage: '',
      waiting: false,
      newArtefactName: '',
      scrolled: ''
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
    canCreate(): boolean {
      return this.newArtefactName.trim().length > 0;
    },
    canUndo() {
      return true;
    },
    scrollVersionId(): number {
      return parseInt(this.$route.params.scrollVersionId);
    },
  },
  mounted() {
    window.addEventListener('scroll', this.handleScroll);
  },
  methods: {
    handleScroll() {
      console.log('888888888888888888888888');
      this.scrolled = window.scrollY > 50;
      this.scrolled = window.scrollX > 50;
    },
    onImageSettingChanged(imageType: string, settings: SingleImageSetting) {
      this.params.imageSettings[imageType] = settings;
      this.notifyChange('imageSettings', this.params.imageSettings);
    },
    onDrawChanged(val: any) { // DrawingMode
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
    undoModal() {
      (this.$refs.undoRef as any).show();
    },
    redoModal() {
      console.log('redo modal');
    },
    undo() {
      this.$emit('undo');
    },
    redo() {
      this.$emit('redo');
    },
    rename(art: Artefact) {
      this.$emit('rename');
    },
    openRename(art: Artefact) {
      this.chooseArtefact(art);
      this.$emit('inputRenameChanged', art);
    },
    chooseArtefact(art: Artefact) {
      this.$emit('artefactChanged', art);
    },
    newArtefact() {
      const newArtefact = Artefact.createNew(this.scrollVersionId, this.fragment, this.newArtefactName);
      newArtefact.sqeImageId = this.fragment.recto!.sqeImageId;
      if (!newArtefact.sqeImageId) {
        console.error('There is no sqeImageId in the fragment');
        newArtefact.sqeImageId = this.artefact.sqeImageId;
      }
      this.$emit('create', newArtefact);
      // waiting = false after artefact added
      this.newArtefactName = '';
      (this.$refs.newArtRef as any).hide();
      this.chooseArtefact(newArtefact);

      this.onDrawChanged('DRAW');
    },
    newModalShown() {
      // this.waiting = true;
      (this.$refs.newArtefactName as any).focus();
    },
    undoModalShown() {},
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
  height: 92vh;
  overflow: auto;
  touch-action: pan-y;
  // position: fixed;
  top: 0;
  right: 0;
}
button.disable {
  cursor: not-allowed;
}
button {
  margin-right: 10px;
  margin-left: 10px;
}
</style>
