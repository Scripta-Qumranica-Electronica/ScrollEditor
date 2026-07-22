<template>
    <div class="scroll-bar main-div">
        <search-form @search="onSearch($event)" :disabled="searching" />
        <b-row>
            <b-col cols="9">
                <waiting style="height: 100px" v-if="searching" />
            </b-col>
        </b-row>

        <search-results :results="searchResults" />
    </div>
</template>
<script lang="ts">
import {
    DetailedSearchRequestDTO,
    DetailedSearchResponseDTO,
} from '@/dtos/sqe-dtos';
import SearchService from '@/services/search';
import { Component, Prop, Vue, toNative } from 'vue-facing-decorator';
import SearchForm from './form.vue';
import { SearchFormData, SearchResults } from './types';
import Waiting from '@/components/misc/Waiting.vue';
import SearchResultComponent from './results.vue';

@Component({
    name: 'search',
    components: {
        'search-form': SearchForm,
        waiting: Waiting,
        'search-results': SearchResultComponent,
    },
})
class Search extends Vue {
    public searchService: SearchService = new SearchService();
    public searchData = new SearchFormData();
    public searchResults: SearchResults | null = null;
    public searching = false;

    public mounted() {
        this.searchResults = null;
    }

    public async onSearch(data: SearchFormData) {
        this.searching = true;
        this.searchData = data;
        this.searchResults = null;
        try {
            this.searchResults = await this.searchService.search(data);
        } finally {
            this.searching = false;
        }
    }
}
export default toNative(Search);
</script>


<style lang="scss" scoped>
.scroll-bar {
    max-height: calc(100vh - 140px);
    overflow-y: auto;
    overflow-x: hidden;
}

.main-div {
    padding: 0 15%;
    border-bottom: none !important;
}
</style>
