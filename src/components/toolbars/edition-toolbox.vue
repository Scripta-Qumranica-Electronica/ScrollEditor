<template>
<toolbox>
      <b-button variant="outline-secondary" @click="openMetadata()" class="style-button">
        <i class="fa fa-info"></i></b-button>
      <edition-metadata-modal></edition-metadata-modal>
    <b-button variant="outline-secondary" @click="openCopyrightInfo()" class="style-button">
        <i class="fa fa-copyright"></i></b-button>
    <edition-copyright-info-modal></edition-copyright-info-modal>
</toolbox>

</template>
<script lang="ts">
import EditionCopyrightInfoModal from '@/views/edition/components/copyright.vue';
import EditionMetadataModal from '@/views/edition/components/metadata.vue';
import { Component, Prop, Vue, toNative } from 'vue-facing-decorator';
import Toolbox from './toolbox.vue';

@Component({
    name: 'edition-toolbox',
    components: {
        'edition-metadata-modal': EditionMetadataModal,
        'edition-copyright-info-modal': EditionCopyrightInfoModal,
        toolbox: Toolbox
    },
})
class EditionToolbox extends Vue {
    public openMetadata() {
        console.debug('openMetadata called');
        // TODO(vue3): metadata.vue not yet migrated; switch to a boolean v-model once that
        // component exposes a modelValue prop instead of its id/bus pattern.
        this.$root!.$emit('bv::show::modal', 'editionMetadataModal');
    }
    public openCopyrightInfo() {
        console.debug('openCopyrightInfo called');
        // TODO(vue3): copyright.vue not yet migrated; switch to a boolean v-model once that
        // component exposes a modelValue prop instead of its id/bus pattern.
        this.$root!.$emit('bv::show::modal', 'editionCopyrightInfoModal');
    }
}
export default toNative(EditionToolbox);
</script>
<style lang="scss" scoped>
@import '@/assets/styles/_variables.scss';
.style-button{
    border-radius: 12px;
}
</style>
