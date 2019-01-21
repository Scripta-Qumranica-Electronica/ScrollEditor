<template>
  <div class="row" id="fragment-editor"
  @wheel="mouseWheel"
  v-shortcuts="[
  { shortcut: [ '+' ], callback: zoomIn },
  { shortcut: [ '-' ], callback: zoomOut },
]">
    <div v-if="waiting" class="col">
      <Waiting></Waiting>
    </div>
    <div v-if="!waiting && fragment" id="overlay-div" class="col">
  <!--     AAAAAAAA
     <v-touch @swipeleft="doSomething">
      <p>I can now be swiped on!</p>
      </v-touch>
      <v-touch @rotate="rotateAThing">
        <p>Rotate me!</p>
      </v-touch> -->
      <roi-canvas class="overlay-image"
                  :width="masterImage.manifest.width || 0"
                  :height="masterImage.manifest.height || 0"
                  :params="params"
                  :editable="canEdit"
                  :side="fragment.recto"
                  :divisor="imageShrink"
                  :clipping-mask="artefact.mask">
      </roi-canvas>
      <artefact-canvas class="overlay-canvas"
                        v-show="artefact !== undefined"
                        :width="masterImage.manifest.width ? masterImage.manifest.width / imageShrink : 0"
                        :height="masterImage.manifest.height ? masterImage.manifest.height / imageShrink : 0"
                        :params="params"
                        :editable="canEdit"
                        :clipping-mask="artefact.mask"
                        :divisor="imageShrink"
                        @mask="setClipMask"
                        ref="currentArtCanvas">
      </artefact-canvas>
    </div>
    <div class="col-xl-2 col-lg-3 col-md-4" v-if="!waiting && fragment">
      <image-menu
        :fragment="fragment"
        :artefact="artefact"
        :params="params"
        :editable="canEdit"
        @paramsChanged="onParamsChanged($event)"
        @save="onSave($event)"
        @undo="onUndo($event)"
        @redo="onRedo($event)"
        @rename="onRename($event)"
        :saving="saving"
        :renaming="renaming">
        <!-- old event handlers
                  v-on:opacity="setOpacity"
        v-on:changeBrushSize="changeBrushSize"
        v-on:visible="toggleVisible"
        v-on:drawingMode="toggleDrawingMode"
        v-on:toggleMask="toggleMask"
        v-on:delSelectedRoi="delSelectedRoi"
        v-on:changeViewMode="changeViewMode"
        v-on:changeZoom="changeZoom"
        v-on:fullscreen="toggleFullScreen"
        -->
      </image-menu>
    </div>
  </div>
</template>

<!-- <script src="https://unpkg.com/vue-toasted"></script>-->
<script lang="ts">
import Vue from 'vue';
import Waiting from '@/components/misc/Waiting.vue';
import FragmentService from '@/services/fragment';
import ScrollService from '@/services/scroll';
import ImageService from '@/services/image';
import { Fragment } from '@/models/fragment';
import { Artefact } from '@/models/artefact';
import ImageMenu from './ImageMenu.vue';
import { EditorParams, EditorParamsChangedArgs, MaskChangedEventArgs, DrawingMode } from './types';
import { IIIFImage } from '@/models/image';
import ROICanvas from './RoiCanvas.vue';
import ArtefactCanvas from './ArtefactCanvas.vue';
import { Polygon } from '@/utils/Polygons';

export default Vue.extend({
  name: 'fragment-editor',
  components: {
    Waiting,
    'image-menu': ImageMenu,
    'roi-canvas': ROICanvas,
    'artefact-canvas': ArtefactCanvas,
  },
  data() {
    return {
      fragmentService: new FragmentService(this.$store),
      scrollService: new ScrollService(this.$store),
      imageService: new ImageService(),
      waiting: false,
      artefact: undefined as Artefact | undefined,
      initialMask: undefined as Polygon | undefined,
      params: new EditorParams(),
      imageShrink: 2,
      saving: false,
      renaming: false,
      undoList: [] as MaskChangedEventArgs[],
      redoList: [] as MaskChangedEventArgs[],
    };
  },
  computed: {
    fragment(): Fragment {
      return this.$store.state.fragment.fragment;
    },
    scrollVersionId(): number {
      return parseInt(this.$route.params.scrollVersionId);
    },
    canEdit(): boolean {
      return this.$store.state.scroll.scrollVersion.permissions.canWrite;
    },
    masterImage(): IIIFImage  | undefined {
      if (this.fragment && this.fragment.recto) {
        return this.fragment.recto.master;
      }
      return undefined;
    }
  },
  async mounted() {
    try {
      this.waiting = true;
      await this.scrollService.fetchScrollVersion(this.scrollVersionId);
      await this.fragmentService.fetchFragmentInfo(
        parseInt(this.$route.params.scrollVersionId),
        this.$route.params.fragmentId);

      if (this.fragment && this.fragment.recto && this.fragment.recto.master) {
        await this.imageService.fetchImageManifest(this.fragment.recto.master);
        console.log('Master image manifest is ', this.fragment.recto.master.manifest);
      }

      if (this.fragment!.artefacts!.length) {
        this.artefact = this.fragment!.artefacts![0];
        this.initialMask = this.artefact.mask;
      } else {
        this.artefact = undefined;
        this.initialMask = undefined;
      }

    } finally {
      this.waiting = false;
    }

    this.fillImageSettings();
  },
  methods: {
    fillImageSettings() {
      this.params.imageSettings = {};
      if (this.fragment.recto && this.fragment.recto) {
        for (const imageType of this.fragment.recto.availableImageTypes) {
          const image = this.fragment.recto.getImage(imageType);
          if (image) {
            const master = this.fragment.recto.master === this.fragment.recto.getImage(imageType);
            const imageSetting = {
              image,
              type: imageType,
              visible: master,
              opacity: 1
            };
            this.$set(this.params.imageSettings, imageType, imageSetting); // Make sure this object is tracked by Vue
          }
        }
      }
    },
    setClipMask(eventArgs: MaskChangedEventArgs) { //} Polygon) {
      if (!this.artefact) {
        throw new Error("Can't set mask if there is no artefact");
      }
      // Place current mask in undo buffer, clear redo buffer
      if (this.undoList.length >= 50) {
        this.undoList.slice(1);
      } 
      this.undoList.push(eventArgs);
      this.redoList = [];
      this.artefact.mask = eventArgs.polygon;
    },
    onParamsChanged(evt: EditorParamsChangedArgs) {
      this.params = evt.params; // This makes sure a change is triggered in child components
    },
    async onSave() {
      if (!this.artefact) {
        throw new Error("Can't save if there is no artefact");
      }

      this.saving = true;
      try {
        await this.fragmentService.changeFragmentArtefactShape(this.scrollVersionId, this.fragment, this.artefact);
        this.showMessage('Artefact Saved', false);
      } catch (err) {
        this.showMessage('Artefact save failed', true);
      } finally {
        this.saving = false;
      }
    },
    // onReset() {
    //   if (!this.artefact) {
    //     throw new Error("Can't reset mask if there is no artefact");
    //   }
    //   this.artefact.mask = this.initialMask;
    // },
    onUndo() {
      if (!this.artefact) {
        throw new Error("Can't undo mask if there is no artefact");
      }
      if (this.undoList.length) {
        const toUndo: MaskChangedEventArgs = this.undoList.pop()!;
        this.redoList.push(toUndo);

        // Undo the operation by applying the delta in the opposite direction
        if (toUndo.drawingMode === DrawingMode.DRAW) {
          this.artefact.mask = Polygon.subtract(this.artefact.mask, toUndo.delta);
        } else {
          this.artefact.mask = Polygon.add(this.artefact.mask, toUndo.delta);
        }
      }
    },
    onRedo() {
      if (!this.artefact) {
        throw new Error("Can't redo mask if there is no artefact");
      }
      if (this.redoList.length) {
        const toRedo: MaskChangedEventArgs = this.redoList.pop()!;
        this.undoList.push(toRedo);

        if (toRedo.drawingMode === DrawingMode.DRAW) {
          this.artefact.mask = Polygon.add(this.artefact.mask, toRedo.delta);
        } else {
          this.artefact.mask = Polygon.subtract(this.artefact.mask, toRedo.delta);
        }
      }
    },
    async onRename() {
      if (!this.artefact) {
        throw new Error("Can't rename if there is no artefact");
      }
      this.renaming = true;
      try {
        await this.fragmentService.changeFragmentArtefactName(this.scrollVersionId, this.fragment, this.artefact);
        this.showMessage('Artefact renamed', false);
      } catch (err) {
        this.showMessage('Artefact rename failed', true);
      } finally {
        this.renaming = false;
      }

    },
    showMessage(msg: string, error: boolean) {
      if (error) {
        this.$toasted.show(msg, {
          type: 'error',
          position: 'top-right',
          duration : 7000
        });
      } else {
        this.$toasted.show(msg, {
        type: 'success',
        position: 'top-right',
        duration : 7000
      });
      }
    },
    mouseWheel(event: any) {
      if (event.deltaY > 0) {
        this.zoomOut();
      } else {
        this.zoomIn();
      }
    },
    zoomIn() {
      if (this.params.zoom < 1) {
        this.params.zoom += 0.02;
      }
    },
    zoomOut() {
      if (this.params.zoom > 0.1) {
        this.params.zoom -= 0.02;
      }
    },
    doSomething() {
      console.log("do something!!");
    },
    rotateAThing() {
      console.log("rotateAThing");
    },
  }
});
</script>

<style lang="scss" scoped>
// @import '~sass-vars';
.overlay-image {
  position: absolute; 
  transform-origin: top left;
}
.overlay-canvas {
  position: absolute;
  top: 0;
  left: 0;
  transform-origin: top left;
}
#fragment-editor {
  overflow: hidden;
}
#overlay-div {
  position: relative;
  overflow: scroll;
  margin-right: 15px;
  padding: 0;
}
</style>
