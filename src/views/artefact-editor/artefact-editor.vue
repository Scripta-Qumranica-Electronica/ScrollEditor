<template>
  <div class="wrapper" id="artefact-editor">
    <div v-if="waiting" class="col">
      <Waiting></Waiting>
    </div>
    <div
      id="sidebar"
      class="artefact-menu-div"
      v-if="!waiting && artefact"
      :class="{ sidebarActive : isActiveSidebar }"
    >
      <artefact-side-menu
        :artefact="artefact"
        :params="params"
        @paramsChanged="onParamsChanged($event)"
      ></artefact-side-menu>
    </div>

    <div v-if="!waiting && artefact">
      <div class="row" id="artefact-and-buttons">
        <div class="buttons-div">
          <b-button type="button" class="sidebarCollapse" @click="sidebarClicked()">
            <i class="fa fa-align-justify"></i>
          </b-button>
        </div>
        <div
          class="artefact-container"
          :class="{sidebarActiveAndTextActive: sidebarActiveAndTextActive,
                   sidebarNotActiveAndTextActive: sidebarNotActiveAndTextActive,
                   sidebarActiveAndTextNotActive: sidebarActiveAndTextNotActive,
                   sidebarNotActiveAndTextNotActive: sidebarNotActiveAndTextNotActive
                   }"
        >
          <div ref="overlay-div" v-if="!waiting && artefact">
            <!-- :width="actualWidth"
            :height="actualHeight">-->

            <div id="zoom-div" :style="{transform: `scale(${zoomLevel})`}">
              <div id="rotate-div" :style="{transform: `rotate(${rotationAngle}deg)`}">
                <!--
                 , margin: `${artefactMargin}`}"
                  :width="rotateDivWidth"
                :height="rotateDivHeight">-->
                <div @wheel="onMouseWheel">
                  <artefact-image
                    class="overlay-canvas"
                    v-if="artefact"
                    :artefact="artefact"
                    :scale="scale"
                    :imageSettingsParams="params.imageSettings"
                  ></artefact-image>
                  <sign-overlay
                    :signs="arrayOfSigns"
                    :selectedSignId="clickedSignId"
                    class="overlay-canvas"
                    :originalImageWidth="originalImageWidth"
                    :originalImageHeight="originalImageHeight"
                    :scale="scale"
                    @polygonChanged="polygonChanged($event)"
                  />
                  <sign-canvas
                    v-show="sign.signId"
                    class="overlay-canvas"
                    :id="`${sign.signId}_sign_canvas`"
                    :shapeSign="sign"
                    :originalImageWidth="originalImageWidth"
                    :originalImageHeight="originalImageHeight"
                    :scale="scale"
                    :params="params"
                    @SignChanged="signChanged($event)"
                  />
                  <!-- :shapeSign="sign"-->
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="buttons-div">
          <b-button type="button" class="sidebarCollapse" @click="textClicked()">
            <i class="fa fa-align-justify"></i>
          </b-button>
          <b-button
            v-for="mode in [{icon: 'fa fa-pencil-square-o', val:'POLYGON'}, {icon: 'fa fa-square-o', val: 'RECTANGLE'}]"
            :key="mode.val"
            @click="editingModeChanged(mode.val)"
            :pressed="modeChosen(mode.val)"
            class="sidebarCollapse"
          >
            <i :class="mode.icon"></i>
          </b-button>
            <b-button type="button" class="sidebarCollapse" @click="deletePolygon()">
            <i class="fa fa-trash"></i>
          </b-button>
        </div>
      </div>
    </div>

    <div
      id="text-right-sidebar"
      v-if="!waiting && artefact"
      :class="{sidebarActiveAndTextActive: sidebarActiveAndTextActive,
              sidebarNotActiveAndTextActive: sidebarNotActiveAndTextActive,
              sidebarActiveAndTextNotActive: sidebarActiveAndTextNotActive,
              sidebarNotActiveAndTextNotActive: sidebarNotActiveAndTextNotActive
              }"
    >
      <text-side :clickedSignId="clickedSignId" :artefact="artefact"></text-side>
    </div>
  </div>
</template>

<script lang="ts">
import Vue, { PropOptions } from 'vue';
import Waiting from '@/components/misc/Waiting.vue';
import ArtefactImage from './artefact-image.vue';
import { Artefact } from '@/models/artefact';
import EditionService from '@/services/edition';
import ImageService from '@/services/image';
import ArtefactService from '@/services/artefact';
import ArtefactSideMenu from './ArtefactSideMenu.vue';
import TextSide from './TextSide.vue';
import SignCanvas from './SignCanvas.vue';
import SignOverlay from './SignOverlay.vue';
import {
  ArtefactEditorParams,
  ArtefactEditorParamsChangedArgs,
  DrawingShapesMode,
  ShapeSign
} from './types';
import { ZoomRequestEventArgs } from '@/components/editors/types';
import { IIIFImage } from '@/models/image';
import { Position } from '@/utils/PointerTracker';
import {
  ImageSetting,
  SingleImageSetting
} from '@/components/image-settings/types';
import { SignInterpretation } from '@/models/text';
import { Polygon } from '@/utils/Polygons';
import { ImagedObject } from '@/models/imaged-object';

export default Vue.extend({
  name: 'artefact-editor',
  components: {
    Waiting,
    ArtefactImage,
    ArtefactSideMenu,
    TextSide,
    SignCanvas,
    SignOverlay
  },
  props: {},
  data() {
    return {
      clickedSignId: 0,
      showShapeChoice: false,
      arrayOfSigns: [] as ShapeSign[],
      // nonSelectedSigns: [] as ShapeSign[],
      shapeChoice: DrawingShapesMode.POLYGON,
      errorMessage: '',
      waiting: true,
      editionService: new EditionService(),
      imageService: new ImageService(),
      artefactService: new ArtefactService(),
      isActiveSidebar: false,
      isActiveText: false,
      params: new ArtefactEditorParams(),
      masterImage: {} as IIIFImage | undefined,
      sign: {} as ShapeSign,
      imagedObject: {} as ImagedObject | undefined,
      scale: 0.5
    };
  },
  computed: {
    artefact(): Artefact | undefined {
      return this.$state.artefacts.current;
    },
    editionId(): number {
      return parseInt(this.$route.params.editionId);
    },
    overlayDiv(): HTMLDivElement {
      return this.$refs['overlay-div'] as HTMLDivElement;
    },
    zoomLevel(): number {
      return this.params.zoom;
    },
    // On computer screen - Active means closed, for example sidebar active means the sidebar is closed.
    // On tablet screen - Active means opened.
    sidebarActiveAndTextActive(): boolean {
      return this.isActiveSidebar && this.isActiveText;
    },
    sidebarNotActiveAndTextActive(): boolean {
      return !this.isActiveSidebar && this.isActiveText;
    },
    sidebarActiveAndTextNotActive(): boolean {
      return this.isActiveSidebar && !this.isActiveText;
    },
    sidebarNotActiveAndTextNotActive(): boolean {
      return !this.isActiveSidebar && !this.isActiveText;
    },
    originalImageWidth(): number {
      return this.masterImage!.manifest.width;
    },
    originalImageHeight(): number {
      return this.masterImage!.manifest.height;
    },
    // rotateDivWidth(): number {
    //   return this.originalImageWidth * 0.5;
    // },
    // rotateDivHeight(): number {
    //   return this.originalImageHeight * 0.5;
    // },
    rotationAngle(): number {
      return this.params.rotationAngle;
    },
    artefactMargin(): string {
      // margin-top: 0.5*diagonal - 0.5*height
      // margin-left: 0.5*diagonal - 0.5*width
      return '100px';
    }
  },
  async mounted() {
    // this.prepareNonSelectedSigns();
    try {
      this.waiting = true;
      await this.editionService.fetchEdition(this.editionId);
      await this.artefactService.fetchArtefactInfo(
        this.editionId,
        parseInt(this.$route.params.artefactId)
      );
      await this.fillImageSettings();
    } catch (e) {
      console.error(e);
    } finally {
      this.waiting = false;
    }
    this.$root.$on('isClicked', (data: SignInterpretation) => {
      this.clickedSignId = data.signInterpretationId;
      const objectSign = {
        signId: data.signInterpretationId,
        char: data.character,
        shape: this.shapeChoice,
        polygon: new Polygon()
      } as ShapeSign;
      const signIndex = this.arrayOfSigns.findIndex(
        (sign: ShapeSign) => data.signInterpretationId === sign.signId
      );

      if (signIndex < 0) {
        this.arrayOfSigns.push(objectSign);
      } else {
        // update the polygon
        objectSign.polygon = this.arrayOfSigns[signIndex].polygon;
        this.arrayOfSigns[signIndex] = objectSign;
      }

      this.sign = objectSign;
      // this.prepareNonSelectedSigns();
    });
  },
  methods: {
    deletePolygon() {
      const signIndex = this.arrayOfSigns.findIndex(
        (sign: ShapeSign) => this.clickedSignId === sign.signId
      );
      if (signIndex < 0) {
        console.error('There is no object of the clicked sign');
        return;
      }
      this.arrayOfSigns.splice(signIndex, 1);
      this.sign = {} as ShapeSign;
    },
    signChanged(polygon: Polygon) {
      const signIndex = this.arrayOfSigns.findIndex(
        (s: ShapeSign) => this.sign.signId === s.signId
      );
      if (signIndex < 0) {
        throw new Error("Sign doesn't exist");
      }
      this.arrayOfSigns[signIndex].polygon = polygon;
      // this.prepareNonSelectedSigns();
      this.sign = {} as ShapeSign;
    },
    polygonChanged(signId: number) {
      const signIndex = this.arrayOfSigns.findIndex(
        (s: ShapeSign) => signId === s.signId
      );
      if (signIndex < 0) {
        throw new Error("Sign doesn't exist");
      }
      this.clickedSignId = signId;
    },
    getMasterImg(): IIIFImage | undefined {
      if (
        this.imagedObject &&
        this.artefact &&
        this.imagedObject.getImageStack(this.artefact.side)
      ) {
        return this.imagedObject.getImageStack(this.artefact.side)!.master;
      }
      return undefined;
    },
    // prepareNonSelectedSigns() {
      // this.nonSelectedSigns = this.arrayOfSigns.filter(
      //   (sign: ShapeSign) => sign.signId !== this.clickedSignId
      // );
    // },
    modeChosen(val: DrawingShapesMode): boolean {
      return DrawingShapesMode[val].toString() === this.shapeChoice.toString();
    },
    editingModeChanged(val: any) {
      (this as any).shapeChoice = DrawingShapesMode[val];
      const signIndex = this.arrayOfSigns.findIndex(
        (sign: ShapeSign) => this.clickedSignId === sign.signId
      );
      if (this.arrayOfSigns[signIndex]) {
        this.arrayOfSigns[signIndex].shape = this.shapeChoice;
      }
      this.sign.shape = this.shapeChoice;
    },
    sidebarClicked() {
      this.isActiveSidebar = !this.isActiveSidebar;
    },
    textClicked() {
      this.isActiveText = !this.isActiveText;
    },
    onParamsChanged(evt: ArtefactEditorParamsChangedArgs) {
      this.params = evt.params; // This makes sure a change is triggered in child components
    },
    onMouseWheel(event: WheelEvent) {
      // if (!this.selected) {
      //     return;
      // }
      // Only catch control-mousewheel
      if (!event.ctrlKey) {
        return;
      }
      event.preventDefault(); // Don't use the browser's zoom mechanism here, just ours
      const amount = event.deltaY < 0 ? +0.01 : -0.01; // wheel up - zoom in.
      // TODO- What is mouseClientPosition ??
      const mouseClientPosition = {
        x: event.clientX,
        y: event.clientY
      } as Position;
      this.onZoomRequest({
        amount,
        clientPosition: mouseClientPosition
      } as ZoomRequestEventArgs);
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
    async fillImageSettings() {
      if (!this.artefact) {
        return;
      }
      this.params.imageSettings = {}; // as ImageSetting;
      this.imagedObject = await this.artefactService.getArtefactImagedObject(
        this.artefact.editionId!,
        this.artefact.imagedObjectId
      );
      if (
        this.imagedObject &&
        this.imagedObject.getImageStack(this.artefact.side) &&
        this.imagedObject.getImageStack(this.artefact.side)!.master
      ) {
        await this.imageService.fetchImageManifest(
          this.imagedObject.getImageStack(this.artefact.side)!.master
        );
        this.masterImage = this.getMasterImg();
      }
      if (this.imagedObject) {
        const imageStack = this.imagedObject.getImageStack(this.artefact.side);
        if (this.imagedObject && imageStack) {
          for (const imageType of imageStack.availableImageTypes) {
            const image = imageStack.getImage(imageType);
            if (image) {
              const master = imageStack.master.type === imageType;
              const imageSetting = {
                image,
                type: imageType,
                visible: master,
                opacity: 1
              };
              this.$set(this.params.imageSettings, imageType, imageSetting);
            }
          }
          this.masterImage = imageStack.master;
        }
      }
    }
  }
});
</script>

<style lang="scss" scoped>
.overlay-canvas {
  position: absolute;
  transform-origin: top left;
}
#artefact-editor {
  overflow: hidden;
  height: calc(100vh - 63px);
}

.artefact-menu-div {
  height: calc(100vh - 63px);
  overflow: hidden;
}
#zoom-div {
  position: absolute;
}
#rotate-dev {
  transform-origin: top left;
}
.buttons-div {
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

#sidebar.sidebarActive {
  margin-left: -250px;
  transform: rotateY(100deg); /* Rotate sidebar vertically by 100 degrees. */
}

.artefact-container.sidebarActiveAndTextActive {
  overflow: auto;
  position: relative;
  padding: 0;
  height: calc(100vh - 63px);
  width: calc(100vw - 80px);
}

.artefact-container.sidebarNotActiveAndTextActive {
  overflow: auto;
  position: relative;
  padding: 0;
  height: calc(100vh - 63px);
  width: calc(100vw - 330px);
}

.artefact-container.sidebarActiveAndTextNotActive {
  overflow: auto;
  position: relative;
  padding: 0;
  height: calc(100vh - 63px);
  width: calc((100vw - 80px) / 2);
}

.artefact-container.sidebarNotActiveAndTextNotActive {
  overflow: auto;
  position: relative;
  padding: 0;
  height: calc(100vh - 63px);
  width: calc((100vw - 330px) / 2);
}

#text-right-sidebar.sidebarNotActiveAndTextNotActive {
  width: calc((100vw - 330px) / 2);
}

#text-right-sidebar.sidebarActiveAndTextActive {
  margin-right: calc((-100vw + 80px) / 2);
}

#text-right-sidebar.sidebarNotActiveAndTextActive {
  margin-right: calc((-100vw + 330px) / 2);
}

#text-right-sidebar.sidebarActiveAndTextNotActive {
  width: calc((100vw - 80px) / 2);
}

#artefact-and-buttons {
  margin: 0px;
}

// TODO -- update the madia
@media (max-width: 1100px) {
  /* Reversing the behavior of the sidebar: 
       it'll be rotated vertically and off canvas by default, 
       collapsing in on toggle button click with removal of 
       the vertical rotation.   */
  #sidebar {
    margin-left: -250px;
    transform: rotateY(100deg);
  }
  #sidebar.sidebarActive {
    margin-left: 0;
    transform: none;
  }
  .overlay-canvas {
    position: absolute;
    transform-origin: top left;
  }

  // TODO- check the scrolls in tablet, maybe they dno't have to appear.
  .artefact-container.sidebarActiveAndTextActive {
    overflow: scroll;
    position: relative;
    padding: 0;
    height: calc(100vh - 63px);
    width: calc((100vw - 330px) / 2);
  }

  .artefact-container.sidebarNotActiveAndTextActive {
    overflow: scroll;
    position: relative;
    padding: 0;
    height: calc(100vh - 63px);
    width: calc((100vw - 80px) / 2);
  }

  .artefact-container.sidebarActiveAndTextNotActive {
    overflow: scroll;
    position: relative;
    padding: 0;
    height: calc(100vh - 63px);
    width: calc(100vw - 330px);
  }

  .artefact-container.sidebarNotActiveAndTextNotActive {
    overflow: scroll;
    position: relative;
    padding: 0;
    height: calc(100vh - 63px);
    width: calc(100vw - 80px);
  }

  #text-right-sidebar.sidebarNotActiveAndTextNotActive {
    margin-right: calc((-100vw + 80px) / 2);
  }

  #text-right-sidebar.sidebarActiveAndTextActive {
    width: calc((100vw - 330px) / 2);
    transform: rotateY(0deg);
  }

  #text-right-sidebar.sidebarNotActiveAndTextActive {
    width: calc((100vw - 80px) / 2);
  }

  #text-right-sidebar.sidebarActiveAndTextNotActive {
    margin-right: calc(-100vw + 330px);
  }
}
</style>
