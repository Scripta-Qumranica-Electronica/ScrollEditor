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
import { Component, Prop, Vue } from 'vue-property-decorator';
import Toolbox from './toolbox.vue';

@Component({
    name: 'edition-toolbox',
    components: {
        'edition-metadata-modal': EditionMetadataModal,
        'edition-copyright-info-modal': EditionCopyrightInfoModal,
        toolbox: Toolbox
    },
})
export default class EditionToolbox extends Vue {
    private openMetadata() {
        console.debug('openMetadata called');
        this.$root.$emit('bv::show::modal', 'editionMetadataModal');
    }
    private openCopyrightInfo() {
        console.debug('openCopyrightInfo called');
        this.$root.$emit('bv::show::modal', 'editionCopyrightInfoModal');
    }
}
</script>
<style lang="scss" scoped>
@import '@/assets/styles/_variables.scss';
.style-button{
    border-radius: 12px;
}
</style>
