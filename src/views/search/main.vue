<template>
    <div>
        <search-form @search="onSearch($event)" :disabled="searching" />
        <waiting v-if="searching" />
        <!-- <search-results v-if="searchResults" /> -->
    </div>
</template>
<script lang="ts">
import { DetailedSearchRequestDTO, DetailedSearchResponseDTO } from '@/dtos/sqe-dtos';
import SearchService from '@/services/search';
import { Component, Prop, Vue } from 'vue-property-decorator';
import SearchForm from './form.vue';
import { SearchFormData } from './types';
import Waiting from '@/components/misc/Waiting.vue';

@Component({
    name: 'search',
    components: {
        'search-form': SearchForm,
        'waiting': Waiting,
    }
})
export default class Search extends Vue {
    public searchService: SearchService = new SearchService();
    private searchData = new SearchFormData();
    private searchResults: DetailedSearchResponseDTO | null = null;
    private searching = false;

    private mounted() {
        this.searchResults = null;
    }

    private async onSearch(data: SearchFormData) {
        this.searching = true;
        this.searchData = data;
        this.searchResults = null;
        try  {
            this.searchResults = await this.searchService.search(data);
        } finally {
            this.searching = false;
        }
    }
}
</script>