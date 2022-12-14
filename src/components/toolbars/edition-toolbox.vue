<template>
<toolbox>
      <b-button variant="outline-secondary" @click="openMetadata()" class="style-button"><i class="fa fa-info"></i></b-button>
      <edition-metadata-modal></edition-metadata-modal>
</toolbox>

</template>
<script lang="ts">
import EditionMetadataModal from '@/views/edition/components/metadata.vue';
import { Component, Prop, Vue } from 'vue-property-decorator';
import Toolbox from './toolbox.vue';

@Component({
    name: 'edition-toolbox',
    components: {
        'edition-metadata-modal': EditionMetadataModal,
        toolbox: Toolbox
    },
})
export default class EditionToolbox extends Vue {
    private openMetadata() {
        console.debug('openMetadata called');
        this.$root.$emit('bv::show::modal', 'editionMetadataModal');
    }
}
</script>
<style lang="scss" scoped>
@import '@/assets/styles/_variables.scss';
.style-button{
    border-radius: 12px;
}
</style>
