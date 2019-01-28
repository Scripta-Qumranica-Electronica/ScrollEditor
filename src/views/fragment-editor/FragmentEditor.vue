<template>
  <div class="row" id="fragment-editor">
    <div v-if="waiting" class="col">
      <Waiting></Waiting>
    </div>
    <div ref="overlay-div" v-if="!waiting && fragment" 
         id="overlay-div" 
         class="col"> 
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
                        @zoomRequest="onZoomRequest($event)">
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
import { EditorParams, EditorParamsChangedArgs, MaskChangedEventArgs, DrawingMode, Position, ZoomRequestEventArgs } from './types';
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
    },
    overlayDiv(): HTMLDivElement {
      return this.$refs['overlay-div'] as HTMLDivElement;
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
    setClipMask(eventArgs: MaskChangedEventArgs) {
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
      console.log(`Parameter ${evt.property} changed to ${evt.value}`);
    },
    onZoomRequest(event: ZoomRequestEventArgs) {
      console.log(this.$refs);
      const oldZoom = this.params.zoom;
      const newZoom = Math.min(Math.max(oldZoom + event.amount, 0.01), 1);
      if (newZoom === oldZoom) {
        return;
      }

      // After changing the zoom, we want to change the scrollbars to that the mouse cursor stays
      // on the same place in the image. First we need to know the exact coordinates before the zoom
      // We get screen cordinates, we need to translate them to client coordinates
      const viewport = this.overlayDiv.getBoundingClientRect();
      const oldMousePosition = {
        x: event.clientPosition.x - viewport.left + this.overlayDiv.scrollLeft,
        y: event.clientPosition.y - viewport.top + this.overlayDiv.scrollTop,
      }
      console.log(`Translated client ${event.clientPosition.x}, ${event.clientPosition.y} to ${oldMousePosition.x}, ${oldMousePosition.y}`)
      // this.params.zoom = newZoom;
    },
    setZoom(parametes: any) {
      const newZoom = this.params.zoom;
      const artefact = document.querySelector('#overlay-div');
      const artefactRect: any = artefact!.getBoundingClientRect();
      const cornerPoint = {x: artefactRect.x, y: artefactRect.y} as Position;

      const mousePoint = {x: parametes.mouseX, y: parametes.mouseY} as Position;
      console.log('pointCorner', cornerPoint);
      console.log('mousePoint', mousePoint);

      const newPoint = {
        x: mousePoint.x * newZoom / parametes.oldZoom,
        y: mousePoint.y * newZoom / parametes.oldZoom
      } as Position;
      const corner = {
        x: Math.max(cornerPoint.x + newPoint.x - mousePoint.x, 0),
        y: Math.max(cornerPoint.y + newPoint.y - mousePoint.y, 0)
      } as Position;
      console.log('*******newCornerPoint', corner);

      // artefact!.style.top = corner.x + "px";
      // artefact!.style.left = corner.y + "px";

      // TODO: Change the scroll bars so that (X-CornerNew, Y-CornerNew) is the top-left corner of the viewport
      // const artefact = document.querySelector('#overlay-div');
      artefact!.scrollLeft = corner.x; // scroll right
      artefact!.scrollTop = corner.y;
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
  transform-origin: top left;
  position: relative;
  overflow: scroll;
  margin-right: 15px;
  padding: 0;
}
</style>
