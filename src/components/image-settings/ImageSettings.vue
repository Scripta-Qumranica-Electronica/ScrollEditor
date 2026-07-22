<template>
  <div>
      <single-image-setting v-for="imageType in imageStack.availableImageTypes" :key="imageType"
                :type="imageType" :settings="params.imageSettings[imageType]" @change=" onSingleImageSettingChanged($event)">
    </single-image-setting>
</div>
</template>

<script lang="ts">
import { Component, Prop, Vue, toNative } from 'vue-facing-decorator';

import SingleImageSettingComponent from '@/components/image-settings/SingleImageSetting.vue';
import { ImageStack } from '@/models/image';
import { SingleImageSetting, normalizeOpacity } from './types';
import { BaseEditorParams } from '@/models/editor-params';


@Component({
  name: 'image-settings',
  components: {
    'single-image-setting': SingleImageSettingComponent,
  },
})

class ImageSettings extends Vue {

  // props
    @Prop() public imageStack!: ImageStack;

    @Prop() public params!: BaseEditorParams;

  // methods
    public onSingleImageSettingChanged($event: SingleImageSetting) {
      normalizeOpacity(this.params!.imageSettings!);
      this.$emit('image-setting-changed', this.params.imageSettings);
    }

}

export default toNative(ImageSettings);
</script>

<style lang="scss" scoped>

</style>
