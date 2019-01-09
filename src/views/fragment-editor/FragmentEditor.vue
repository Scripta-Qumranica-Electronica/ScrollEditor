<template>
  <div class="row" id="fragment-editor">
    <div v-if="waiting" class="col">
      <Waiting></Waiting>
    </div>
    <div v-if="!waiting && fragment" id="overlay-div" class="col">
      <roi-canvas class="overlay-image"
                  :width="masterImage.manifest.width || 0"
                  :height="masterImage.manifest.height || 0"
                  :params="params"
                  :side="fragment.recto"
                  :divisor="imageShrink"
                  :clipping-mask="artefact.mask">
      </roi-canvas>
      <artefact-canvas class="overlay-canvas"
                        v-show="artefact !== undefined"
                        :width="masterImage.manifest.width ? masterImage.manifest.width / imageShrink : 0"
                        :height="masterImage.manifest.height ? masterImage.manifest.height / imageShrink : 0"
                        :params="params"
                        :artefact="artefact"
                        :divisor="imageShrink"
                        v-on:mask="setClipMask"
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
        @save="onSaved($event)"
        @reset="onReseted($event)">
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

<script lang="ts">
import Vue from 'vue';
import Waiting from '@/components/misc/Waiting.vue';
import FragmentService from '@/services/fragment';
import ScrollService from '@/services/scroll';
import ImageService from '@/services/image';
import MaskService from '@/services/mask';
import { Fragment } from '@/models/fragment';
import { Artefact } from '@/models/artefact';
import ImageMenu from './ImageMenu.vue';
import { EditorParams, EditorParamsChangedArgs } from './types';
import { IIIFImage } from '@/models/image';
import ROICanvas from './RoiCanvas.vue';
import ArtefactCanvas from './ArtefactCanvas.vue';

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
      maskService: new MaskService(this.$store),
      waiting: false,
      artefact: undefined as Artefact | undefined,
      params: new EditorParams(),
      imageShrink: 2,
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
      } else {
        this.artefact = undefined;
      }

    } finally {
      this.waiting = false;
    }

    // Save old mask so we can RESET and UNDO
    // TODO: where do it?
    console.log('mask in store in the beginning:', this.$store.state.mask.mask);
    console.log('artefact.mask in the beginning:', this.artefact!.mask);
    this.maskService.setMask(this.artefact!.mask);

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
    setClipMask(svgMask: string) {
      console.log('svgMask set to ', svgMask);
      this.artefact!.mask = svgMask; // TODO: Save old mask so we can RESET and UNDO
    },
    onParamsChanged(evt: EditorParamsChangedArgs) {
      this.params = evt.params; // This makes sure a change is triggered in child components
    },
    onSaved(evt: any) {
      // TODO: save
      this.maskService.setMask(this.artefact!.mask);
    },
    onReseted() {
      console.log('before reset: mask=', this.artefact!.mask);
      this.artefact!.mask = this.$store.state.mask.mask; // taken from store
      console.log('after reset: mask=', this.artefact!.mask);
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
  top: 0;
  left: 0;
  transform-origin: top left;
}
#fragment-editor {
  overflow: hidden;
}
#overlay-div {
  position: relative;
  height: 800px;
  width: 1500px;
  overflow: scroll;
  margin-right: 15px;
}
</style>
