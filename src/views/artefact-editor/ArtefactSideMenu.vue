<template>
  <div id="artefact-side-menu" :class="{ 'fixed-header': scrolled }" role="tablist">
    <section>
      <b-card no-body class="mb-1">
        <b-card-header header-tag="header" class="p-1" role="tab">
          <b-button block href="#" v-b-toggle.accordion-images variant="info">Images</b-button>
        </b-card-header>
        <b-collapse id="accordion-images" visible accordion="my-accordion" role="tabpanel">
          <b-card-body>
            <image-settings :imageStack="imageStack" :params="params" @imageSettingChanged="onImageSettingChanged($event)" />
          </b-card-body>
        </b-collapse>
      </b-card>
    </section>

    <section>
      <b-card no-body class="mb-1">
        <b-card-header header-tag="header" class="p-1" role="tab">
          <b-button block href="#" v-b-toggle.accordion-params variant="info">Editor parameters</b-button>
        </b-card-header>
        <b-collapse id="accordion-params" accordion="my-accordion" role="tabpanel">
          <b-card-body>
            <section>
              <div class="row">
                <div class="col-5">
                  Zoom: {{formatTooltip()}}
                </div>
                <div class="col">          
                  <b-form-input ref="zoomRef" type="range" min="0.1" max="1" step="0.01"  v-model="zoom"></b-form-input> <!-- v-b-tooltip.hover :title="formatTooltip()"-->
                </div>
              </div>
              <div class="row">
                <div class="col">
                  <b-form-input type="number" v-model="rotationAngle"/> 
                </div>
              </div>
            </section>
          </b-card-body>
        </b-collapse>
      </b-card>
    </section>
  </div>
</template>

<script lang="ts">
import Vue, { PropOptions } from 'vue';
import { ImagedObject } from '@/models/imaged-object';
import { Artefact } from '@/models/artefact';
import { ArtefactEditorParams, ArtefactEditorParamsChangedArgs } from './types';
import ImageSettingsComponent from '@/components/image-settings/ImageSettings.vue';
import ImagedObjectService from '../../services/imaged-object';
import ArtefactService from '../../services/artefact';
import { ImageStack } from '../../models/image';
import { SingleImageSetting } from '../../components/image-settings/types';

export default Vue.extend({
  name: 'artefcat-side-menu',
  components: {
    'image-settings': ImageSettingsComponent,
  },
  data() {
    return {
      errorMessage: '',
      artefactService: new ArtefactService(),
      imageStack: {} as ImageStack,
    };
  },
  props: {
    artefact: Artefact,
    params: ArtefactEditorParams,
  },
  computed: {
    editionId(): number {
      return parseInt(this.$route.params.editionId);
    },
    scrolled(): boolean {
        return true;
    },
    zoom: {
      get(): number {
          return this.params.zoom;
      },
      set(val: any) {
          this.params.zoom = parseFloat(val);
          this.notifyChange('zoom', val);
      }
    },
    rotationAngle: {
      get(): number {
          return this.params.rotationAngle;
      },
      set(val: any) {
          this.params.rotationAngle = parseFloat(val);
          this.notifyChange('rotationAngle', val);
      }
    },
  },
  async mounted() {
    const imagedObject = await this.artefactService.getArtefactImagedObject(
        this.artefact.editionId!, this.artefact.imagedObjectId);
    this.imageStack = imagedObject.getImageStack(this.artefact.side) as ImageStack;
  },
  methods: {
    formatTooltip(): string {
      return (this.zoom * 100).toFixed(0) + '%';
    },
    notifyChange(paramName: string, paramValue: any) {
      const args = {
        property: paramName,
        value: paramValue,
        params: this.params,
      } as ArtefactEditorParamsChangedArgs;
      this.$emit('paramsChanged', args);
    },
    onImageSettingChanged(settings: SingleImageSetting) {
      this.params.imageSettings[settings.type] = settings;
      this.notifyChange('imageSettings', this.params.imageSettings);
    },
  }
});
</script>

<style lang="scss" scoped>
#artefact-side-menu {
  touch-action: pan-y;
  top: 0;
  right: 0;
}
span.selected {
  font-weight: bold;
}
section {
  margin-bottom: 20px;
}
button {
  margin-right: 10px;
}
.btn-info {
  background-color: #6c757d;
  border-color: #6c757d;
}
</style>
