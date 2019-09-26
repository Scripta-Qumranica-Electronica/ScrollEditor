<template>
  <div class="wrapper" id="imaged-object-editor">
    <div v-if="waiting" class="col">
      <Waiting></Waiting>
    </div> 
    <div
      id="sidebar"
      class="imaged-object-menu-div col-xl-2 col-lg-3 col-md-4"
      v-if="!waiting && imagedObject"
      :class="{ active : isActive }"
    >
      <imaged-object-menu
        :imagedObject="imagedObject"
        :artefacts="visibleArtefacts"
        :artefact="artefact"
        :params="params"
        :editable="canEdit"
        :side="side"
        @paramsChanged="onParamsChanged($event)"
        @save="onSave($event)"
        @undo="onUndo($event)"
        @redo="onRedo($event)"
        @create="onNew($event)"
        @rename="onRename($event)"
        @deleteArtefact="onDeleteArtefact($event)"
        @inputRenameChanged="inputRenameChanged($event)"
        @artefactChanged="onArtefactChanged($event)"
        @onSideArtefactChanged="sideArtefactChanged($event)"
        :saving="saving"
        :renaming="renaming"
        :renameInputActive="renameInputActive"
      ></imaged-object-menu>
    </div>

    <div id="content" class="container col-xl-12 col-lg-12 col-md-12"
      v-if="!waiting && imagedObject"> <!-- todo: add external div with the condition -->
      <div class="row">
        <div id="buttons-div">
          <b-button type="button" class="sidebarCollapse" @click="sidebarClicked()">
            <i class="fa fa-align-justify"></i>
          </b-button>

          <b-button v-for="mode in editList" 
            :key="mode.val" @click="editingModeChanged(mode.val)" 
            :pressed="modeChosen(mode.val)" class="sidebarCollapse">
            <i :class="mode.icon"></i>
          </b-button>
        </div>
        <div class="imaged-object-container"
          :class="{active: isActive}">
          <div
            ref="overlay-div"
            v-if="!waiting && imagedObject"
            :width="actualWidth"
            :height="actualHeight"
            id="overlay-div">
            <div id="zoom-div"
              :style="{transform: `scale(${zoomLevel})`}"
              >
              <div id="rotate-div"
                :width="rotateDivWidth"
                :height="rotateDivHeight"
                :style="{transform: `translate${translatePosition} rotate(${rotationAngle}deg)`}"
              >
                <roi-canvas
                  class="overlay-image"
                  :originalImageWidth="originalImageWidth"
                  :originalImageHeight="originalImageHeight"
                  :params="params"
                  :editable="canEdit"
                  :clipping-mask="artefact.mask.polygon"
                ></roi-canvas>
                <imaged-object-canvas
                  v-for="artefact in nonSelectedArtefacts"
                  :key="artefact.id"
                  class="overlay-canvas"
                  :originalImageWidth="originalImageWidth"
                  :originalImageHeight="originalImageHeight"
                  :params="params"
                  :selected="false"
                  :artefact="artefact"
                ></imaged-object-canvas>
                <imaged-object-canvas
                  class="overlay-canvas"
                  v-show="artefact !== undefined"
                  :originalImageWidth="originalImageWidth"
                  :originalImageHeight="originalImageHeight"
                  :params="params"
                  :selected="true"
                  :editable="canEdit"
                  :artefact="artefact"
                  @maskChanged="onMaskChanged"
                  @zoomRequest="onZoomRequest($event)"
                ></imaged-object-canvas>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<!-- <script src="https://unpkg.com/vue-toasted"></script>-->
<script lang="ts">
import Vue from 'vue';
import Waiting from '@/components/misc/Waiting.vue';
import ImagedObjectService from '@/services/imaged-object';
import EditionService from '@/services/edition';
import ImageService from '@/services/image';
import { ImagedObject } from '@/models/imaged-object';
import { Artefact } from '@/models/artefact';
import ImagedObjectMenu from './ImagedObjectMenu.vue';
import {
  ImagedObjectEditorParams,
  EditorParamsChangedArgs,
  MaskChangeOperation,
  MaskChangedEventArgs,
  DrawingMode,
  ArtefactEditingData,
  OptimizedArtefact,
  SideOption
} from './types';
import { Position } from '@/utils/PointerTracker';
import { IIIFImage } from '@/models/image';
import ROICanvas from './RoiCanvas.vue';
import ImagedObjectCanvas from './ImagedObjectCanvas.vue';
import { Polygon } from '@/utils/Polygons';
import { Side } from '../../models/misc';
import { ZoomRequestEventArgs } from '@/components/editors/types';

export default Vue.extend({
  name: 'imaged-object-editor',
  components: {
    Waiting,
    'imaged-object-menu': ImagedObjectMenu,
    'roi-canvas': ROICanvas,
    'imaged-object-canvas': ImagedObjectCanvas
  },
  data() {
    return {
      imagedObjectService: new ImagedObjectService(),
      editionService: new EditionService(),
      imageService: new ImageService(),
      waiting: true,
      artefact: undefined as OptimizedArtefact | undefined,
      initialMask: new Polygon(),
      params: new ImagedObjectEditorParams(),
      saving: false,
      renaming: false,
      renameInputActive: undefined as OptimizedArtefact | undefined,
      nonSelectedArtefacts: [] as OptimizedArtefact[],
      nonSelectedMask: new Polygon(),
      artefactEditingDataList: [] as ArtefactEditingData[],
      artefactEditingData: new ArtefactEditingData(),
      optimizedArtefacts: [] as OptimizedArtefact[],
      isActive: false,
      masterImage: {} as IIIFImage | undefined,
      sideOptions: SideOption.getSideOptions(),
      side: {} as Side,
    };
  },
  computed: {
    editList(): any[] {
      if (this.canEdit) {
        return [{icon: 'fa fa-pencil', val: 'DRAW'}, {icon: 'fa fa-trash', val: 'ERASE'}];
      }
      return [];
    },
    zoomLevel(): number {
      return this.params.zoom;
    },
    imagedObject(): ImagedObject | undefined {
      return this.$state.imagedObjects.current;
    },
    editionId(): number {
      return parseInt(this.$route.params.editionId);
    },
    canEdit(): boolean {
      return this.$state.editions.current ? this.$state.editions.current.permission.mayWrite : false;
    },
    actualWidth(): number {
      return this.originalImageWidth * this.zoomLevel * this.$render.scalingFactors.image;
    },
    actualHeight(): number {
      return this.originalImageHeight * this.zoomLevel * this.$render.scalingFactors.image;
    },
    rotateDivWidth(): number {
      return this.originalImageWidth / this.$render.scalingFactors.image;
    },
    rotateDivHeight(): number {
      return this.originalImageHeight / this.$render.scalingFactors.image;
    },
    rotationAngle(): number {
      return ((this.params.rotationAngle % 360) + 360) % 360;
    },
    translatePosition(): string {
      switch (this.rotationAngle) {
        case 90: {
          return `(${this.rotateDivHeight}px, 0px)`;
        } case 180: {
          return `(${this.rotateDivWidth}px, ${this.rotateDivHeight}px)`;
        } case 270: {
          return `(0px, ${this.rotateDivWidth}px)`;
        } default: {
          return '(0, 0)';
        }
      }
    },
    overlayDiv(): HTMLDivElement {
      return this.$refs['overlay-div'] as HTMLDivElement;
    },
    originalImageWidth(): number {
      return this.masterImage!.manifest.width;
    },
    originalImageHeight(): number {
      return this.masterImage!.manifest.height;
    },
    visibleArtefacts(): OptimizedArtefact[] {
      return this.optimizedArtefacts.filter((item: OptimizedArtefact) => item.side === this.side);
    }
  },
  async mounted() {
    try {
      this.waiting = true;
      await this.editionService.getEdition(this.editionId);
      await this.imagedObjectService.getImagedObjectInfo(
        this.editionId,
        this.$route.params.imagedObjectId
      );

      if (this.imagedObject && this.imagedObject.getImageStack(this.side)
          && this.imagedObject.getImageStack(this.side)!.master) {
        await this.imageService.requestImageManifest(this.imagedObject.getImageStack(this.side)!.master);
        this.masterImage = this.getMasterImg();
      }

      if (this.imagedObject!.artefacts!.length) {
        this.optimizeArtefacts();
        // Set this.artefact to visibleArtefacts[0]
        this.onArtefactChanged(this.visibleArtefacts[0]);
        this.optimizedArtefacts.forEach((element) => {
          this.artefactEditingDataList.push(new ArtefactEditingData());
        });
        // Remove this because it will happen in onArtefactChanged function.
        // this.artefactEditingData = this.getArtefactEditingData(0);
        this.initialMask = this.artefact!.optimizedMask;
      } else {
        this.artefact = undefined;
        this.initialMask = new Polygon();
      }
    } finally {
      this.waiting = false;
    }

    this.fillImageSettings();
    // Remove this because it will happen in onArtefactChanged function.
    // this.prepareNonSelectedArtefacts();
  },
  created() {
    window.addEventListener('beforeunload', (e) => this.confirmLeaving(e));
  },
  methods: {
    getMasterImg(): IIIFImage | undefined {
      if (this.imagedObject && this.imagedObject.getImageStack(this.side)) {
        return this.imagedObject.getImageStack(this.side)!.master;
      }
      return undefined;
    },
    confirmLeaving(e: BeforeUnloadEvent) {
      this.artefactEditingDataList.forEach((art) => {
        if (art.dirty) {
          // check if there unsaved changes
          const confirmationMessage =
            'It looks like you have been editing something. ' +
            'If you leave before saving, your changes will be lost.';

          (e || window.event).returnValue = confirmationMessage;
          return confirmationMessage;
        }
      });
    },
    fillImageSettings() {
      this.params.imageSettings = {};
      if (this.imagedObject) {
        if (this.imagedObject && this.imagedObject.getImageStack(this.side)) {
          for (const imageType of this.imagedObject.getImageStack(this.side)!.availableImageTypes) {
            const image = this.imagedObject.getImageStack(this.side)!.getImage(imageType);
            if (image) {
              const master =
                this.imagedObject.getImageStack(this.side)!.master.type === imageType;
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
      }
    },
    optimizeArtefacts() {
      if (!this.imagedObject || !this.imagedObject.artefacts) {
        this.optimizedArtefacts = [];
      } else {
        this.optimizedArtefacts = this.imagedObject.artefacts.map(
          (artefact, index) =>
            new OptimizedArtefact(
              artefact,
              index,
              this.$render.scalingFactors.combined
            )
        );
        // If the ImagedObject has both sides, Recto should be selected by default when the editor is open.
        if (this.optimizedArtefacts[0].side === this.sideOptions[0].name) {
          this.side = this.sideOptions[0].name as Side;
        } else {
          this.side = this.sideOptions[1].name as Side;
        }
      }
    },
    onMaskChanged(eventArgs: MaskChangedEventArgs) {
      if (!this.artefact) {
        throw new Error("Can't set mask if there is no artefact");
      }
      this.artefactEditingData.dirty = true;

      // Check if the new mask intersects with a non selected artefact mask
      const intersection = Polygon.intersect(
        eventArgs.optimizedMask,
        this.nonSelectedMask
      );
      if (!intersection.empty) {
        this.$toasted.show("Artefact can't overlap other artefacts", {
          type: 'info',
          position: 'top-center',
          duration: 5000
        });
        return;
      }

      // Store the old masks for the undo buffer
      const changeOperation = {
        prevMask: this.artefact.mask.polygon,
        prevOptimizedMask: this.artefact.optimizedMask
      } as MaskChangeOperation;

      // Calculate the new masks (the unoptimized mask is used by the ROI Canvas)
      this.artefact.optimizedMask = eventArgs.optimizedMask;
      this.artefact.unoptimizeMask();

      changeOperation.newMask = this.artefact.mask.polygon;
      changeOperation.newOptimizedMask = this.artefact.optimizedMask;

      if (this.artefactEditingData.undoList.length >= 50) {
        this.artefactEditingData.undoList.slice(1);
      }

      this.artefactEditingData.undoList.push(changeOperation);
      this.artefactEditingData.redoList = [];
    },
    editingModeChanged(val: any) {
      (this as any).params.drawingMode = DrawingMode[val];
    },
    onParamsChanged(evt: EditorParamsChangedArgs) {
      this.params = evt.params; // This makes sure a change is triggered in child components
    },
    onZoomRequest(event: ZoomRequestEventArgs) {
      const oldZoom = this.params.zoom;
      const newZoom = Math.min(Math.max(oldZoom + event.amount, 0.05), 1);
      if (newZoom === oldZoom) {
        return;
      }

      // After changing the zoom, we want to change the scrollbars to that the mouse cursor stays
      // on the same place in the image. First we need to know the exact coordinates before the zoom
      // We get screen cordinates, we need to translate them to client coordinates
      const viewport = this.overlayDiv.getBoundingClientRect();
      const oldMousePosition = {
        x: event.clientPosition.x - viewport.left + this.overlayDiv.scrollLeft,
        y: event.clientPosition.y - viewport.top + this.overlayDiv.scrollTop
      };
      const newMousePosition = {
        x: (oldMousePosition.x * newZoom) / oldZoom,
        y: (oldMousePosition.y * newZoom) / oldZoom
      };
      const scrollDelta = {
        x: newMousePosition.x - oldMousePosition.x,
        y: newMousePosition.y - oldMousePosition.y
      };

      setTimeout(() => {
        this.overlayDiv.scrollLeft += scrollDelta.x;
        this.overlayDiv.scrollTop += scrollDelta.y;
      }, 0);

      this.params.zoom = newZoom;
    },
    showSaveMsg(savedFlag: boolean, errorFlag: boolean) {
      this.saving = false;

      if (!savedFlag) {
         this.showMessage('No changed detected');
      } else if (errorFlag) {
        this.showMessage('Imaged Object Save Failed', 'error');
      } else {
        this.showMessage('Imaged Object Saved', 'success');
      }
    },
    onSave() {
      if (!this.artefact) {
        throw new Error("Can't save if there is no artefact");
      }
      this.saving = true;
      let savedFlag = false;
      let errorFlag = false;

      this.optimizedArtefacts.forEach(async (art, index) => {
        if (this.artefactEditingDataList[index].dirty) {
          savedFlag = true;

          await this.imagedObjectService.changeArtefact(
            this.editionId,
            art
          ).catch (() => {
            errorFlag = true;
          })
          .finally (() => {
              if (index === this.optimizedArtefacts.length - 1) {
                this.showSaveMsg(savedFlag, errorFlag);
              }
          });
          this.artefactEditingDataList[index].dirty = false;
        } else {
          setTimeout(() => {
            if (index === this.optimizedArtefacts.length - 1) {
              this.showSaveMsg(savedFlag, errorFlag);
            }
          }, 1000);
        }
      });
    },
    onUndo() {
      if (!this.artefact) {
        throw new Error("Can't undo mask if there is no artefact");
      }
      if (this.artefactEditingData.undoList.length) {
        this.artefactEditingData.dirty = true;

        const toUndo: MaskChangeOperation = this.artefactEditingData.undoList.pop()!;
        this.artefactEditingData.redoList.push(toUndo);

        this.artefact.optimizedMask = toUndo.prevOptimizedMask;
        this.artefact.mask.polygon = toUndo.prevMask;
      }
    },
    onRedo() {
      if (!this.artefact) {
        throw new Error("Can't redo mask if there is no artefact");
      }
      if (this.artefactEditingData.redoList.length) {
        const toRedo: MaskChangeOperation = this.artefactEditingData.redoList.pop()!;
        this.artefactEditingData.undoList.push(toRedo);

        this.artefact.optimizedMask = toRedo.newOptimizedMask;
        this.artefact.mask.polygon = toRedo.newMask;
      }
    },
    async onNew(art: Artefact) {
      const optimized = new OptimizedArtefact(
        art,
        this.optimizedArtefacts.length,
        this.$render.scalingFactors.combined
      );
      this.optimizedArtefacts.push(optimized);

      this.artefact = optimized;
      this.prepareNonSelectedArtefacts();
      if (!this.artefact) {
        throw new Error("Can't create if there is no artefact");
      }
      this.saving = true;
      try {
        this.artefactEditingData = new ArtefactEditingData();
        this.artefactEditingDataList.push(this.artefactEditingData);
        this.showMessage('Artefact Created', 'success');
      } catch (err) {
        this.showMessage('Artefact creation failed', 'error');
      } finally {
        this.saving = false;
      }
    },
    async onRename() {
      if (!this.artefact) {
        throw new Error("Can't rename if there is no artefact");
      }
      this.renaming = true;
      try {
        await this.imagedObjectService.changeArtefact(
          this.editionId,
          this.artefact
        );
        this.showMessage('Artefact renamed', 'success');
        // this.renameInputActive = {};
        this.inputRenameChanged(undefined);
      } catch (err) {
        this.showMessage('Artefact rename failed', 'error');
      } finally {
        this.renaming = false;
      }
    },
    async onDeleteArtefact(art: OptimizedArtefact) {
      try {
        await this.imagedObjectService.deleteArtefact(art);
        this.showMessage('Artefact deleted', 'success');
        const index = this.optimizedArtefacts.indexOf(art);
        this.optimizedArtefacts.splice(index, 1);
        this.artefactEditingDataList.splice(index, 1);

        if (this.optimizedArtefacts[0]) {
          this.artefact = this.optimizedArtefacts[0];
          this.artefactEditingData = this.artefactEditingDataList[0];
        } else {
          this.artefact = undefined;
          this.initialMask = new Polygon();
        }
        this.prepareNonSelectedArtefacts();
      } catch (err) {
        console.error(err);
        this.showMessage('Delete artefact failed', 'error');
      }
    },
    inputRenameChanged(art: OptimizedArtefact | undefined) {
      this.renameInputActive = art;
    },
    onArtefactChanged(art: OptimizedArtefact) {
      this.artefact = art;
      const index = this.optimizedArtefacts.indexOf(art); // index artefact in artefact list.
      this.artefactEditingData = this.getArtefactEditingData(index);
      this.prepareNonSelectedArtefacts();
    },
    sideArtefactChanged(side: SideOption) {
      this.side = side.name as Side;
      if (this.artefact!.side !== side.name) {
        this.onArtefactChanged(this.visibleArtefacts[0]);
      }
      this.fillImageSettings();
    },
    getArtefactEditingData(index: number) {
      return this.artefactEditingDataList[index];
    },
    showMessage(msg: string, type: string = 'info') {
      this.$toasted.show(msg, {
        type,
        position: 'top-right',
        duration: 7000
      });
    },
    prepareNonSelectedArtefacts() {
      this.nonSelectedArtefacts = this.visibleArtefacts.filter(
        (artefact: OptimizedArtefact) => artefact !== this.artefact
      );
      this.nonSelectedMask = new Polygon();
      for (const artefact of this.nonSelectedArtefacts) {
        this.nonSelectedMask = Polygon.add(this.nonSelectedMask, artefact.mask.polygon);
      }
    },
    sidebarClicked() {
      this.isActive = !this.isActive;
    },
    modeChosen(val: DrawingMode): boolean {
      return DrawingMode[val].toString() === this.params.drawingMode.toString();
    },
  },
});

/*
 * Todo:
 *
 * Add a shrinkFactor data element, initialize to 20.
 * Pass shrinkFactor as a property to ImagedObjectCanvas, and not as a data entry of ImagedObjectCanvas
 * Change ImagedObjectCanvas to use the optimizedMask instead of the mask
 * Make sure ImagedObjectCanvas does not shrink the mask (in clipCanvas and trace)
 * Before saving, call unoptimize mask to create the larger mask again
 */
</script>

<style lang="scss" scoped>
// @import '~sass-vars';
.overlay-image {
  position: absolute;
  transform-origin: top left;
}
.overlay-canvas {
  position: absolute;
  transform-origin: top left;
}
#imaged-object-editor {
  overflow: hidden;
  height: calc(100vh - 63px);
}

.imaged-object-container {
  overflow: auto;
  position: relative;
  padding: 0;
  height: calc(100vh - 63px);
  width: calc(100vw - 290px);
}
.imaged-object-container.active {
  overflow: auto;
  position: relative;
  padding: 0;
  height: calc(100vh - 63px);
  width: calc(100vw - 40px);
}
.imaged-object-menu-div {
  height: calc(100vh - 63px);
  overflow: hidden;
}
#zoom-div {
  position: absolute;
}
#rotate-dev {
  transform-origin: top left;
}
#buttons-div {
  background-color: #eff1f4;
}

.sidebarCollapse {
  width: 40px;
  height: 40px;
  display: block;
  margin-bottom: 5px;
}

.wrapper {
  display: flex;
  align-items: stretch;
  perspective: 1500px;
}

#sidebar {
  min-width: 250px;
  max-width: 250px;
  transition: all 0.6s cubic-bezier(0.945, 0.02, 0.27, 0.665);
  transform-origin: center left; /* Set the transformed position of sidebar to center left side. */
}

#sidebar.active {
  margin-left: -250px;
  transform: rotateY(100deg); /* Rotate sidebar vertically by 100 degrees. */
}

@media (max-width: 1100px) {
  /* Reversing the behavior of the sidebar: 
       it'll be rotated vertically and off canvas by default, 
       collapsing in on toggle button click with removal of 
       the vertical rotation.   */
  #sidebar {
    margin-left: -250px;
    transform: rotateY(100deg);
  }
  #sidebar.active {
    margin-left: 0;
    transform: none;
  }

  .imaged-object-container {
    overflow: scroll;
    position: relative;
    padding: 0;
    height: calc(100vh - 63px);
    width: calc(100vw - 40px);
  }

  .imaged-object-container.active {
    overflow: scroll;
    position: relative;
    padding: 0;
    height: calc(100vh - 63px);
    width: calc(100vw - 40px);
  }
}
</style>
