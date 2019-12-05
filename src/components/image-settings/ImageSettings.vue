<template>
  <div>
      <single-image-setting v-for="imageType in imageStack.availableImageTypes" :key="imageType" 
                :type="imageType" :settings="params.imageSettings[imageType]" @change=" onSingleImageSettingChanged($event)">
    </single-image-setting>
</div>
</template>

<script lang="ts">
import Vue from 'vue';
import SingleImageSettingComponent from '@/components/image-settings/SingleImageSetting.vue';
import { ImagedObject } from '@/models/imaged-object';
import { ImageStack } from '@/models/image';
import { ImagedObjectEditorParams } from '@/views/imaged-object-editor/types';
import { SingleImageSetting } from './types';
import { ArtefactEditorParams } from '@/views/artefact-editor/types';
import { BaseEditorParams } from '@/models/editor-params';

export default Vue.extend({
  name: 'image-settings',
  components: {
    'single-image-setting': SingleImageSettingComponent,
  },
  props: {
    imageStack: {
      type: Object as () => ImageStack,
    },
    params: {
      type: Object as () => BaseEditorParams,
    },
  },
  data() {
    return {
      errorMessage: '',
    };
  },
  methods: {
      onSingleImageSettingChanged($event: SingleImageSetting) {
          this.$emit('imageSettingChanged', this.params.imageSettings);
      }
  },
});
</script>

<style lang="scss" scoped>

</style>
