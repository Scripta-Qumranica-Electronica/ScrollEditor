<template>
  <div>
      <single-image-setting v-for="imageType in imageStack.availableImageTypes" :key="imageType" 
                :type="imageType" :settings="params.imageSettings[imageType]" @change="onImageSettingChanged($event)">
    </single-image-setting>
</div>
</template>

<script lang="ts">
import Vue from 'vue';
import SingleImageSettingComponent from '@/components/editors/SingleImageSetting.vue';
import { ImagedObject } from '@/models/imaged-object';
import { ImageStack } from '@/models/image';
import { EditorParams } from '@/views/imaged-object-editor/types';
import { SingleImageSetting } from './types';
import { ArtefactEditorParams } from '@/views/artefact-editor/types';

export default Vue.extend({
  name: 'image-settings',
  components: {
    'single-image-setting': SingleImageSettingComponent,
  },
  props: {
    imageStack: {
      type: Object as () => ImageStack,
    },
    params: Object // EditorParams or ArtefactEditorParams,
  },
  data() {
    return {
      errorMessage: '',
    };
  },
  methods: {
      onImageSettingChanged($event: any) {
          const singleImgSetting = $event as SingleImageSetting;
          this.$emit('imageSettingChanged', singleImgSetting);
      }
  },
});
</script>

<style lang="scss" scoped>

</style>
