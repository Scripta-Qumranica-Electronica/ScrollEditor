<template>
    <div v-if="editions">
        <ol>
            <li v-for="edition in editions" :key="edition.id">{{ edition.id }}</li>
        </ol>
    </div>
</template>
<script lang="ts">
import { DetailedSearchRequestDTO, EditionDTO } from '@/dtos/sqe-dtos';
import SearchService from '@/services/search';
import { Component, Emit, Prop, Vue } from 'vue-property-decorator';
import { SearchFormData, SearchResults } from './types';

@Component({
    name: 'edition-results',
})
export default class EditionResultsComponent extends Vue {
    @Prop( { default: null })
    private editions!: EditionDTO[] | null;
}
</script>