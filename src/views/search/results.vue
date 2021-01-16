<template>
    <div v-if="results">
        <p v-if="empty">Search returned no results</p>
        <div v-else>
            <edition-results :editions="results.editions.editions" />
            <artefact-results :artefacts="results.artefacts.artefacts" />
        </div>
    </div>
</template>
<script lang="ts">
import { DetailedSearchRequestDTO } from '@/dtos/sqe-dtos';
import SearchService from '@/services/search';
import { Component, Emit, Prop, Vue } from 'vue-property-decorator';
import ArtefactResultComponent from './artefact-results.vue';
import EditionResultsComponent from './edition-results.vue';
import { SearchFormData, SearchResults } from './types';

@Component({
    name: 'search-results',
    components: {
        'edition-results': EditionResultsComponent,
        'artefact-results': ArtefactResultComponent,
    }
})
export default class SearchResultComponent extends Vue {
    @Prop( { default: null })
    private results!: SearchResults | null;

    private get empty() {
        function items<T>(a?: T[]) {
            if (!a) {
                return 0;
            }

            return a.length;
        }

        if (!this.results) {
            return true;
        }

        const count = items(this.results.editions?.editions) +
                      items(this.results.textFragments?.textFragments) +
                      items(this.results.artefacts?.artefacts) +
                      items(this.results.images?.imagedObjects);

        return count === 0;
    }

    private get prettyResults(): string {
        if (!this.results) {
            return '';
        }

        return JSON.stringify(this.results, null, 4);
    }
}
</script>