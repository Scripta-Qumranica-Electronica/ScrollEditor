<template>
    <div class="wrapper" id="artefact-editor">
    <div v-if="waiting" class="col">
      <Waiting></Waiting>
    </div> 
    <div
      id="sidebar"
      class="artefact-menu-div col-xl-2 col-lg-3 col-md-4"
      v-if="!waiting && artefact"
      :class="{ active : isActive }"
    >
      <artefact-side-menu
        :artefact="artefact"
        :params="params"
        @paramsChanged="onParamsChanged($event)"
      ></artefact-side-menu>
    </div>

    <div id="content" class="container col-xl-12 col-lg-12 col-md-12"
      v-if="!waiting && artefact">
      <div class="row">
        <div id="buttons-div">
          <b-button type="button" class="sidebarCollapse" @click="sidebarClicked()">
            <i class="fa fa-align-justify"></i>
          </b-button>
        </div>
        <div class="artefact-container"
          :class="{active: isActive}">
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
                <artefact-image
                  class="card-img-top"
                  v-if="artefact"
                  :artefact="artefact"
                  :scale="0.5"
                  @zoomRequest="onZoomRequest($event)"></artefact-image><!--overlay-canvas-->
              </div>
            </div>
          </div>
        </div>
      </div>
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
import { ArtefactEditorParams, ArtefactEditorParamsChangedArgs } from './types';
import { ZoomRequestEventArgs } from '../../components/editors/types';
import { IIIFImage } from '../../models/image';

export default Vue.extend({
    name: 'artefact-editor',
    components: {
        Waiting,
        ArtefactImage,
        ArtefactSideMenu,
    },
    props: {
    },
    data() {
        return {
            errorMessage: '',
            waiting: true,
            editionService: new EditionService(),
            artefactService: new ArtefactService(),
            isActive: false,
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
            this.isActive = !this.isActive;
        },
        onParamsChanged(evt: ArtefactEditorParamsChangedArgs) {
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
        async fillImageSettings() {
            if (!this.artefact) {
                return;
            }
            this.params.imageSettings = {};
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
  height: calc(100vh - 56px);
}

.artefact-container {
  overflow: scroll;
  position: relative;
  padding: 0;
  height: calc(100vh - 56px);
  width: calc(100vw - 290px);
}
.artefact-container.active {
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
.artefact-menu-div {
  height: calc(100vh - 56px);
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
