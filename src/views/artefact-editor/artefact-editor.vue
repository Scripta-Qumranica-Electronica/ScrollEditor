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
    <!--  col-xl-2 col-lg-3 col-md-4-->
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
        <div class="artefact-container"
          :class="{sidebarClosedAndTextClosed: sidebarClosedAndTextClosed,
                   sidebarOpenedAndTextClosed: sidebarOpenedAndTextClosed,
                   sidebarClosedAndTextOpened: sidebarClosedAndTextOpened,
                   sidebarOpenedAndTextOpened: sidebarOpenedAndTextOpened
                   }">
                   <!--  col-md-10 -->
          <!-- :class="{sidebarActive: isActiveSidebar, textActive: isActiveText}"> -->
          <div
            ref="overlay-div"
            v-if="!waiting && artefact"
            id="overlay-div ">
            <!-- :width="actualWidth"
            :height="actualHeight"> -->

            <div id="zoom-div"
              :style="{transform: `scale(${zoomLevel})`}"
              >
              <div id="rotate-div">
                <!--
                :width="rotateDivWidth"
                :height="rotateDivHeight"
                :style="{transform: `translate${translatePosition} rotate(${rotationAngle}deg)`}"
              >-->
                <div @wheel="onMouseWheel">
                  <artefact-image
                    class="overlay-canvas"
                    v-if="artefact"
                    :artefact="artefact"
                    :scale="0.5"
                    :imageSettingsParams="params.imageSettings"
                  ></artefact-image>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="buttons-div">
          <b-button type="button" class="sidebarCollapse" @click="textClicked()">
            <i class="fa fa-align-justify"></i>
          </b-button>
        </div>
      </div>
    </div>

    <div
      id="text-right-sidebar"
      v-if="!waiting && artefact"
      :class="{sidebarClosedAndTextClosed: sidebarClosedAndTextClosed,
              sidebarOpenedAndTextClosed: sidebarOpenedAndTextClosed,
              sidebarClosedAndTextOpened: sidebarClosedAndTextOpened,
              sidebarOpenedAndTextOpened: sidebarOpenedAndTextOpened
              }">
      <!-- class="col-xl-4 col-lg-5 col-md-6" -->
      <text-side
        :artefact="artefact"
      ></text-side>
    </div>
  </div>
</template>

<script lang="ts">
import Vue, { PropOptions } from 'vue';
import Waiting from '@/components/misc/Waiting.vue';
import ArtefactImage from './artefact-image.vue';
import { Artefact } from '../../models/artefact';
import EditionService from '../../services/edition';
import ArtefactService from '../../services/artefact';
import ArtefactSideMenu from './ArtefactSideMenu.vue';
import TextSide from './TextSide.vue';
import { ArtefactEditorParams, ArtefactEditorParamsChangedArgs } from './types';
import { ZoomRequestEventArgs } from '../../components/editors/types';
import { IIIFImage } from '../../models/image';
import { Position } from '@/utils/PointerTracker';
import { ImageSetting, SingleImageSetting } from '../../components/image-settings/types';

export default Vue.extend({
    name: 'artefact-editor',
    components: {
        Waiting,
        ArtefactImage,
        ArtefactSideMenu,
        TextSide,
    },
    props: {
    },
    data() {
        return {
            errorMessage: '',
            waiting: true,
            editionService: new EditionService(),
            artefactService: new ArtefactService(),
            isActiveSidebar: false,
            isActiveText: false,
            params: new ArtefactEditorParams(),
            masterImage: {} as IIIFImage | undefined,
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
        sidebarClosedAndTextClosed(): boolean {
          return this.isActiveSidebar && this.isActiveText;
        },
        sidebarOpenedAndTextClosed(): boolean {
          return !this.isActiveSidebar && this.isActiveText;
        },
        sidebarClosedAndTextOpened(): boolean {
          return this.isActiveSidebar && !this.isActiveText;
        },
        sidebarOpenedAndTextOpened(): boolean {
          return !this.isActiveSidebar && !this.isActiveText;
        },
        // actualWidth(): number {
        //   return this.originalImageWidth * this.zoomLevel * this.$render.scalingFactors.image;
        // },
        // actualHeight(): number {
        //   return this.originalImageHeight * this.zoomLevel * this.$render.scalingFactors.image;
        // },
        // originalImageWidth(): number {
        //   return this.masterImage!.manifest.width;
        // },
        // originalImageHeight(): number {
        //   return this.masterImage!.manifest.height;
        // },
    },
    async mounted() {
        try {
            this.waiting = true;
            await this.editionService.fetchEdition(this.editionId);
            await this.artefactService.fetchArtefactInfo(
                this.editionId,
                parseInt(this.$route.params.artefactId)
            );
            this.fillImageSettings();
        } catch {
            console.error('Error in artefact editor');
        } finally {
            this.waiting = false;
        }
    },
    methods: {
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
            const mouseClientPosition = {x: event.clientX, y: event.clientY} as Position;
            this.onZoomRequest({
                amount,
                clientPosition: mouseClientPosition,
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
            const imagedObject = await this.artefactService.getArtefactImagedObject(
                this.artefact.editionId!, this.artefact.imagedObjectId);
            if (imagedObject) {
              const imageStack = imagedObject.getImageStack(this.artefact.side);
              if (imagedObject && imageStack) {
                  for (const imageType of imageStack.availableImageTypes) {
                      const image = imageStack.getImage(imageType);
                      if (image) {
                          const master =
                              imageStack.master.type === imageType;
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
        },
    },
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

#overlay-div {
  transform-origin: top left;
  position: absolute;
  overflow: hidden;
  // margin-right: 15px;
  padding: 0;
  height: calc(100vh - 63px);
  width: calc(100vw- 80px);
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

.artefact-container.sidebarClosedAndTextClosed {
  overflow: scroll;
  position: relative;
  padding: 0;
  height: calc(100vh - 63px);
  width: calc(100vw - 80px);
}

.artefact-container.sidebarOpenedAndTextClosed {
  overflow: scroll;
  position: relative;
  padding: 0;
  height: calc(100vh - 63px);
  width: calc(100vw - 330px);
}

.artefact-container.sidebarClosedAndTextOpened {
  overflow: scroll;
  position: relative;
  padding: 0;
  height: calc(100vh - 63px);
  width: calc((100vw - 80px)/2);
}

.artefact-container.sidebarOpenedAndTextOpened {
  overflow: scroll;
  position: relative;
  padding: 0;
  height: calc(100vh - 63px);
  width: calc((100vw - 330px)/2);
}


#text-right-sidebar.sidebarOpenedAndTextOpened {
  width: calc((100vw - 330px)/2);
  transition: all 0.6s cubic-bezier(0.945, 0.02, 0.27, 0.665);
  transform-origin: center right; /* Set the transformed position of sidebar to center left side. */
}

#text-right-sidebar.sidebarClosedAndTextClosed {
  margin-right: calc((-100vw + 80px)/2);
  transform: rotateY(100deg); /* Rotate sidebar vertically by 100 degrees. */
}

#text-right-sidebar.sidebarOpenedAndTextClosed {
   margin-right: calc((-100vw + 330px)/2);
  transform: rotateY(100deg); /* Rotate sidebar vertically by 100 degrees. */
}

#text-right-sidebar.sidebarClosedAndTextOpened {
  width: calc((100vw - 80px)/2);
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
  #sidebar.active {
    margin-left: 0;
    transform: none;
  }

  .artefact-container {
    overflow: scroll;
    position: relative;
    padding: 0;
    height: calc(100vh - 56px);
    width: calc(100vw - 40px);
  }

  .artefact-container.active {
    overflow: scroll;
    position: relative;
    padding: 0;
    height: calc(100vh - 56px);
    width: calc(100vw - 40px);
  }
}
</style>
