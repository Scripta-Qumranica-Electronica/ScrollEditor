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
import { showModal } from '@/utils/modal-bus';

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
        showModal('editionMetadataModal');
    }
    public openCopyrightInfo() {
        console.debug('openCopyrightInfo called');
        showModal('editionCopyrightInfoModal');
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
