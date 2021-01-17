<template>
    <div v-if="results" class="mt-4">
        <p v-if="empty">Search returned no results</p>
        <div v-else>
            <edition-results :editions="results.editions.editions" />
            <artefact-results :artefacts="results.artefacts.artefacts" />
            <imaged-object-results :imaged-objects="results.images.imagedObjects" />
            <text-fragment-results :text-fragments="results.textFragments.textFragments" />
        </div>
    </div>
</template>
<script lang="ts">
import { DetailedSearchRequestDTO } from '@/dtos/sqe-dtos';
import SearchService from '@/services/search';
import { Component, Emit, Prop, Vue } from 'vue-property-decorator';
import ArtefactResultComponent from './artefact-results.vue';
import EditionResultsComponent from './edition-results.vue';
import ImagedObjectResultComponent from './imaged-object-results.vue';
import TextFragmentResultComponent from './text-fragment-results.vue';
import { SearchFormData, SearchResults } from './types';

@Component({
    name: 'search-results',
    components: {
        'edition-results': EditionResultsComponent,
        'artefact-results': ArtefactResultComponent,
        'imaged-object-results': ImagedObjectResultComponent,
        'text-fragment-results': TextFragmentResultComponent,
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

<style lang="scss" scoped>
@import '@/assets/styles/_variables.scss';
@import '@/assets/styles/_fonts.scss';

p {
    font-style: $font-style;
    font-weight: $font-weight-1;
    font-size: $font-size-3;
    font-family: $font-family;
}
</style>