<template>
  <div class="wrapper" id="fragment-editor">
    <div v-if="waiting" class="col">
      <Waiting></Waiting>
    </div>
    <div
      id="sidebar"
      class="image-menu-div col-xl-2 col-lg-3 col-md-4"
      v-if="!waiting && fragment"
      :class="{ active : isActive }"
    >
      <image-menu
        :fragment="fragment"
        :artefacts="optimizedArtefacts"
        :artefact="artefact"
        :params="params"
        :editable="canEdit"
        @paramsChanged="onParamsChanged($event)"
        @save="onSave($event)"
        @undo="onUndo($event)"
        @redo="onRedo($event)"
        @create="onNew($event)"
        @rename="onRename($event)"
        @inputRenameChanged="inputRenameChanged($event)"
        @artefactChanged="onArtefactChanged($event)"
        :saving="saving"
        :renaming="renaming"
        :renameInputActive="renameInputActive"
      ></image-menu>
    </div>

    <div id="content" class=" container col-xl-12 col-lg-12 col-md-12"
      v-if="!waiting && fragment"> <!-- todo: add external div with the condition -->
      <div class="row">
        <div id="buttons-div">
          <button type="button" class="sidebarCollapse" @click="sidebarClicked()">
            <span></span>
            <span></span>
            <span></span>
          </button>
          <button type="button" class="sidebarCollapse" @click="editingModeChanged(0)">
            <i class="fa fa-pencil"></i>
          </button>
          <button type="button" class="sidebarCollapse" @click="editingModeChanged(1)">
            <i class="fa fa-trash"></i>
          </button>
        </div>
        <div class="fragment-container"
          :class="{active: isActive}">
          <div
            ref="overlay-div"
            v-if="!waiting && fragment"
            :width="width * zoomLevel || 0"
            :height="height * zoomLevel || 0"
            id="overlay-div ">
            <roi-canvas
              class="overlay-image"
              :width="width || 0"
              :height="height || 0"
              :style="{transform: `scale(${zoomLevel})`}"
              :params="params"
              :fragment="fragment"
              :editable="canEdit"
              :side="fragment.recto"
              :clipping-mask="artefact.mask"
            ></roi-canvas>
            <artefact-canvas
              v-for="artefact in nonSelectedArtefacts"
              :key="artefact.id"
              class="overlay-canvas"
              :width="width"
              :height="height"
              :style="{transform: `scale(${zoomLevel * $render.scalingFactors.canvas}) rotate(${params.rotationAngle}deg`}"
              :params="params"
              :selected="false"
              :artefact="artefact"
            ></artefact-canvas>
            <artefact-canvas
              class="overlay-canvas"
              v-show="artefact !== undefined"
              :width="width"
              :height="height"
              :style="{transform: `scale(${zoomLevel * $render.scalingFactors.canvas}) rotate(${params.rotationAngle}deg`}"
              :params="params"
              :selected="true"
              :editable="canEdit"
              :artefact="artefact"
              @maskChanged="onMaskChanged"
              @zoomRequest="onZoomRequest($event)"
            ></artefact-canvas>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<!-- <script src="https://unpkg.com/vue-toasted"></script>-->
<script lang="ts">
import Vue from "vue";
import Waiting from "@/components/misc/Waiting.vue";
import FragmentService from "@/services/fragment";
import ScrollService from "@/services/scroll";
import ImageService from "@/services/image";
import { Fragment } from "@/models/fragment";
import { Artefact } from "@/models/artefact";
import ImageMenu from "./ImageMenu.vue";
import {
  EditorParams,
  EditorParamsChangedArgs,
  MaskChangeOperation,
  MaskChangedEventArgs,
  DrawingMode,
  ZoomRequestEventArgs,
  ArtefactEditingData,
  OptimizedArtefact
} from "./types";
import { Position } from "@/utils/PointerTracker";
import { IIIFImage } from "@/models/image";
import ROICanvas from "./RoiCanvas.vue";
import ArtefactCanvas from "./ArtefactCanvas.vue";
import { Polygon } from "@/utils/Polygons";

export default Vue.extend({
  name: "fragment-editor",
  components: {
    Waiting,
    "image-menu": ImageMenu,
    "roi-canvas": ROICanvas,
    "artefact-canvas": ArtefactCanvas
  },
  data() {
    return {
      fragmentService: new FragmentService(this.$store),
      scrollService: new ScrollService(this.$store),
      imageService: new ImageService(),
      waiting: false,
      artefact: undefined as OptimizedArtefact | undefined,
      initialMask: new Polygon(),
      params: new EditorParams(),
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
    };
  },
  computed: {
    zoomLevel(): number {
      return this.params.zoom;
    },
    fragment(): Fragment {
      return this.$store.state.fragment.fragment;
    },
    scrollVersionId(): number {
      return parseInt(this.$route.params.scrollVersionId);
    },
    canEdit(): boolean {
      return this.$store.state.scroll.scrollVersion.permissions.canWrite;
    },
    // masterImage(): IIIFImage | undefined {
    //   if (this.fragment && this.fragment.recto) {
    //     return this.fragment.recto.master;
    //   }
    //   return undefined;
    // },
    overlayDiv(): HTMLDivElement {
      return this.$refs["overlay-div"] as HTMLDivElement;
    },
    width(): number {
      const angle = ((this.params.rotationAngle % 360) + 360) % 360; // Handle negative numbers
      if (angle === 90 || angle === 270) {
        return this.masterImage!.manifest.height;
      } else {
        return this.masterImage!.manifest.width;        
      }
    },
    height(): number {
      const angle = ((this.params.rotationAngle % 360) + 360) % 360;
      if (angle === 90 || angle === 270) {
        return this.masterImage!.manifest.width;
      } else {
        return this.masterImage!.manifest.height;        
      }
    }
  },
  async mounted() {
    try {
      this.waiting = true;
      await this.scrollService.fetchScrollVersion(this.scrollVersionId);
      await this.fragmentService.fetchFragmentInfo(
        parseInt(this.$route.params.scrollVersionId),
        this.$route.params.fragmentId
      );

      if (this.fragment && this.fragment.recto && this.fragment.recto.master) {
        await this.imageService.fetchImageManifest(this.fragment.recto.master);
      }

      if (this.fragment!.artefacts!.length) {
        this.optimizeArtefacts();
        this.artefact = this.optimizedArtefacts[0];
        this.optimizedArtefacts.forEach(element => {
          this.artefactEditingDataList.push(new ArtefactEditingData());
        });
        this.artefactEditingData = this.getArtefactEditingData(0);
        this.initialMask = this.artefact.optimizedMask;
      } else {
        this.artefact = undefined;
        this.initialMask = new Polygon();
      }
    } finally {
      this.waiting = false;
    }

    this.fillImageSettings();
    this.prepareNonSelectedArtefacts();
    this.masterImage = this.getMasterImg();
  },
  created() {
    window.addEventListener("beforeunload", e => this.confirmLeaving(e));
  },
  methods: {
    getMasterImg() :IIIFImage | undefined {
      if (this.fragment && this.fragment.recto) {
        return this.fragment.recto.master;
      }
      return undefined;
    },
    confirmLeaving(e: BeforeUnloadEvent) {
      this.artefactEditingDataList.forEach(art => {
        if (art.dirty) {
          // check if there unsaved changes
          const confirmationMessage =
            "It looks like you have been editing something. " +
            "If you leave before saving, your changes will be lost.";

          (e || window.event).returnValue = confirmationMessage;
          return confirmationMessage;
        }
      });
    },
    fillImageSettings() {
      this.params.imageSettings = {};
      if (this.fragment.recto && this.fragment.recto) {
        for (const imageType of this.fragment.recto.availableImageTypes) {
          const image = this.fragment.recto.getImage(imageType);
          if (image) {
            const master =
              this.fragment.recto.master ===
              this.fragment.recto.getImage(imageType);
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
    optimizeArtefacts() {
      if (!this.fragment || !this.fragment.artefacts) {
        this.optimizedArtefacts = [];
      } else {
        this.optimizedArtefacts = this.fragment.artefacts.map(
          (artefact, index) =>
            new OptimizedArtefact(
              artefact,
              index,
              this.$render.scalingFactors.combined
            )
        );
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
          type: "info",
          position: "top-center",
          duration: 5000
        });
        return;
      }

      // Store the old masks for the undo buffer
      const changeOperation = {
        prevMask: this.artefact.mask,
        prevOptimizedMask: this.artefact.optimizedMask
      } as MaskChangeOperation;

      // Calculate the new masks (the unoptimized mask is used by the ROI Canvas)
      this.artefact.optimizedMask = eventArgs.optimizedMask;
      this.artefact.unoptimizeMask();

      changeOperation.newMask = this.artefact.mask;
      changeOperation.newOptimizedMask = this.artefact.optimizedMask;

      if (this.artefactEditingData.undoList.length >= 50) {
        this.artefactEditingData.undoList.slice(1);
      }

      this.artefactEditingData.undoList.push(changeOperation);
      this.artefactEditingData.redoList = [];
    },
    editingModeChanged(val: number) {
      this.params.drawingMode = val;
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
    onSave() {
      if (!this.artefact) {
        throw new Error("Can't save if there is no artefact");
      }

      this.saving = true;
      try {
        this.optimizedArtefacts.forEach(async (art, index) => {
          if (this.artefactEditingDataList[index].dirty) {
            await this.fragmentService.changeFragmentArtefactShape(
              this.scrollVersionId,
              this.fragment,
              art
            );
            this.artefactEditingDataList[index].dirty = false;
          }
        });
        this.showMessage("Fragment Saved", false);
      } catch (err) {
        this.showMessage("Fragment save failed", true);
      } finally {
        this.saving = false;
      }
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
        this.artefact.mask = toUndo.prevMask;
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
        this.artefact.mask = toRedo.newMask;
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
        await this.fragmentService.createFragmentArtefact(
          this.scrollVersionId,
          this.fragment,
          this.artefact
        );
        this.artefactEditingDataList.push(new ArtefactEditingData());
        this.showMessage("Artefact Created", false);
      } catch (err) {
        this.showMessage("Artefact creation failed", true);
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
        await this.fragmentService.changeFragmentArtefactName(
          this.scrollVersionId,
          this.fragment,
          this.artefact
        );
        this.showMessage("Artefact renamed", false);
        // this.renameInputActive = {};
        this.inputRenameChanged(undefined);
      } catch (err) {
        this.showMessage("Artefact rename failed", true);
      } finally {
        this.renaming = false;
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
    getArtefactEditingData(index: number) {
      return this.artefactEditingDataList[index];
    },
    showMessage(msg: string, error: boolean) {
      if (error) {
        this.$toasted.show(msg, {
          type: "error",
          position: "top-right",
          duration: 7000
        });
      } else {
        this.$toasted.show(msg, {
          type: "success",
          position: "top-right",
          duration: 7000
        });
      }
    },
    prepareNonSelectedArtefacts() {
      this.nonSelectedArtefacts = this.optimizedArtefacts.filter(
        artefact => artefact !== this.artefact
      );
      this.nonSelectedMask = new Polygon();
      for (const artefact of this.nonSelectedArtefacts) {
        this.nonSelectedMask = Polygon.add(this.nonSelectedMask, artefact.mask);
      }
    },
    sidebarClicked() {
      this.isActive = !this.isActive;
    }
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
  transform-origin: top left;
}
#fragment-editor {
  overflow: hidden;
  height: calc(100vh - 56px);
}
.fragment-container {
  overflow: scroll;
  position: relative;
  padding: 0;
  height: calc(100vh - 56px);
  width: calc(100vw - 290px);
}
.fragment-container.active {
  overflow: scroll;
  position: relative;
  padding: 0;
  height: calc(100vh - 56px);
  width: calc(100vw - 40px);
}
#overlay-div {
  transform-origin: top left;
  position: absolute;
  overflow: hidden;
  // margin-right: 15px;
  padding: 0;
  height: calc(100vh - 56px);
  width: calc(100vw- 40px);
}
.image-menu-div {
  height: calc(100vh - 56px);
  overflow: hidden;
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

.sidebarCollapse span {
  width: 80%;
  height: 2px;
  margin: 4px;
  display: block;
  background: #555;
  transition: all 0.8s cubic-bezier(0.81, -0.33, 0.345, 1.375);
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

  .fragment-container {
    overflow: scroll;
    position: relative;
    padding: 0;
    height: calc(100vh - 56px);
    width: calc(100vw - 40px);
  }

  .fragment-container.active {
    overflow: scroll;
    position: relative;
    padding: 0;
    height: calc(100vh - 56px);
    width: calc(100vw - 40px);
  }
}
</style>
