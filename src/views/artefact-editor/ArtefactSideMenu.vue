<template>
  <div id="imaged-object-menu" :class="{ 'fixed-header': scrolled }" role="tablist">
    <section>
      <b-card no-body class="mb-1">
        <b-card-header header-tag="header" class="p-1" role="tab">
          <b-button block href="#" v-b-toggle.accordion-artefacts variant="info">Artefacts</b-button>
        </b-card-header>
        <b-collapse id="accordion-artefacts" visible accordion="my-accordion" role="tabpanel">
          <b-card-body>
            <label>AAAA</label>
          </b-card-body>
        </b-collapse>
      </b-card>
    </section>
<!--
    <section>
      <b-card no-body class="mb-1">
        <b-card-header header-tag="header" class="p-1" role="tab">
          <b-button block href="#" v-b-toggle.accordion-images variant="info">Images</b-button>
        </b-card-header>
        <b-collapse id="accordion-images" accordion="my-accordion" role="tabpanel">
          <b-card-body>
            <single-image-setting v-for="imageType in imagedObject.recto.availableImageTypes" :key="imageType" 
                              :type="imageType" :settings="params.imageSettings[imageType]" @change="onImageSettingChanged(imageType, $event)">
            </single-image-setting>
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
              <!-- zoom -->
           <!--   <div class="row">
                <div class="col-5">
                  Zoom: {{formatTooltip()}}
                </div>
                <div class="col">          
                  <b-form-input ref="zoomRef" type="range" min="0.1" max="1" step="0.01"  v-model="zoom"></b-form-input> <!-- v-b-tooltip.hover :title="formatTooltip()"-->
    <!--        </div>
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
          </b-card-body>
        </b-collapse>
      </b-card>
    </section>-->
</div>
</template>

<script lang="ts">
import Vue, { PropOptions } from 'vue';
import { ImagedObject } from '@/models/imaged-object';
import { Artefact } from '@/models/artefact';

// import SingleImageSettingComponent from './SingleImageSetting.vue';
import ImagedObjectService from '../../services/imaged-object';

export default Vue.extend({
  name: 'artefcat-side-menu',
  components: {
    // 'single-image-setting': SingleImageSettingComponent,
  },
  data() {
    return {
      errorMessage: '',
    };
  },
  computed: {
    editionId(): number {
      return parseInt(this.$route.params.editionId);
    },
    scrolled(): boolean {
        return true;
    }
  },
  methods: {
    aaa() {
       console.log("aaa")
    },

  }
});
</script>

<style lang="scss" scoped>
</style>
