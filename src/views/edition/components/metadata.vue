<template>
    <div>
        Metadata
    </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import Waiting from '@/components/misc/Waiting.vue';

@Component({
    name: 'edition-artefacts',
    components: {
        Waiting,
    },
})
export default class EditionMetadata extends Vue {
    public editionId: number = 0;

    protected async mounted() {
        this.editionId = parseInt(this.$route.params.editionId, 10);
        await this.$state.prepare.edition(this.editionId);
   }
}

</script>
<style lang="scss" scoped>
</style>
