<template>
    <div v-if="editions" class="scroll-bar">
        <edition-list
            :title="sectionTitle"
            class="text-edition"
            :editions="editions"
        ></edition-list>
    </div>
</template>
<script lang="ts">
import { DetailedSearchRequestDTO, EditionDTO } from '@/dtos/sqe-dtos';
import SearchService from '@/services/search';
import { Component, Emit, Prop, Vue } from 'vue-property-decorator';
import EditionsList from '../home/components/EditionsList.vue';
import { SearchFormData, SearchResults } from './types';

@Component({
    name: 'edition-results',
    components: {
        'edition-list': EditionsList,
    }
})
export default class EditionResultsComponent extends Vue {
    @Prop( { default: null })
    private editions!: EditionDTO[] | null;

    private get sectionTitle() {
        return `Editions (${this.editions?.length || 0})`;
    }
}
</script>

<style lang="scss" scoped>
@import '@/assets/styles/_variables.scss';
@import '@/assets/styles/_fonts.scss';

.direction {
    float: right;
}
.text-color {
    color: $black;
}
.text-edition {
    font-style: $font-style;
    font-weight: $font-weight-1;
    font-size: $font-size-3;
    font-family: $font-family;
}
.edition-list {
    padding-top: 70px;
}
.scroll-bar {
    overflow-y: auto;
    max-height: calc(400px);
}
</style>
