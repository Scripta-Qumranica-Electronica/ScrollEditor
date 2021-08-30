<template>
    <RecycleScroller
        id="public-list"
        :items="indices"
        :item-size="153"
        v-slot="{ item }">
        
        <edition-public-row
            @edition-copy-click="openCopyEditionModal(edition)"
            :editions="editions" 
            :key="item"
            :index="item" />
    </RecycleScroller>
</template>       

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import { EditionInfo } from '@/models/edition';
import EditionPublicRow from './edition-public-row.vue';

@Component({
    name: 'editions-public-list',
    components: {
        EditionPublicRow,
     },
})
export default class EditionsPublicList extends Vue {
    @Prop( ) public editions!: EditionInfo[];

    protected get indices() {
        const indices: number[] = [];
        for (let idx = 0; idx < this.editions.length; idx += 4) {
            indices.push(idx);
        }

        return indices;
    }

    protected openCopyEditionModal(edition: EditionInfo) {
        this.$state.editions.current = edition;
        this.$root.$emit('bv::show::modal', 'copy-edition-modal');
    }
}
</script>

<style  lang="scss" scoped>
@import '@/assets/styles/_variables.scss';
@import '@/assets/styles/_fonts.scss';

#public-list {
    overflow-y: auto;
    max-height: calc(100vh - 240px);
}

</style>
