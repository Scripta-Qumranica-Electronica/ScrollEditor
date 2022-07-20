<template>
  <div>
      <single-image-setting v-for="imageType in imageStack.availableImageTypes" :key="imageType"
                :type="imageType" :settings="params.imageSettings[imageType]" @change=" onSingleImageSettingChanged($event)">
    </single-image-setting>
</div>
</template>

<script lang="ts">
import { Component, Prop, Emit, Vue } from 'vue-property-decorator';

import SingleImageSettingComponent from '@/components/image-settings/SingleImageSetting.vue';
import { ImageStack } from '@/models/image';
import { SingleImageSetting, normalizeOpacity } from './types';
import { BaseEditorParams } from '@/models/editor-params';



import EditionSidebar from './components/sidebar.vue';
import { EditionInfo } from '@/models/edition.js';
import Waiting from '@/components/misc/Waiting.vue';

import PermissionModal from './components/permission-modal.vue';


@Component({
  name: 'image-settings',
  components: {
    'single-image-setting': SingleImageSettingComponent,
  },
})

export default class ImageSettings extends Vue {

  // props
    @Prop() protected imageStack!: ImageStack;

    @Prop() protected params!: BaseEditorParams;

  // methods
    public onSingleImageSettingChanged($event: SingleImageSetting) {
      normalizeOpacity(this.params!.imageSettings!);
      this.$emit('image-setting-changed', this.params.imageSettings);
    }

}

</script>

<style lang="scss" scoped>

</style>
