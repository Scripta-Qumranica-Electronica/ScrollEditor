<template>
    <div v-if="editions && ready" class="scroll-bar" id="search-editions">
        <edition-list
            :title="sectionTitle"
            class="text-edition"
            :editions="actualEditions"
        ></edition-list>
    </div>
</template>
<script lang="ts">
import { DetailedSearchRequestDTO, EditionDTO } from '@/dtos/sqe-dtos';
import { EditionInfo } from '@/models/edition';
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
    private ready = false;

    private async mounted() {
        this.ready = false;
        await this.$state.prepare.allEditions();
        this.ready = true;
    }

    private get actualEditions(): EditionInfo[] {
        // From EditionDTO to EditionInfo - we have the editions in our store
        if (!this.editions) {
            return [];
        }

        return this.editions.map(ed => this.$state.editions.find(ed.id)).filter(ed => !!ed) as EditionInfo[];
    }

    private get sectionTitle() {
        return `Editions (${this.actualEditions.length || 0})`;
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
.search-editions {
    padding-top: 70px;
}
.scroll-bar {
    overflow-y: auto;
    max-height: calc(400px);
}
</style>
