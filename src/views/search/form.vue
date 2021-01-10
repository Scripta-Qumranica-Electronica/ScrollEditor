<template>
    <div>
        <b-row class="mt-5" align-v="center">
            <b-col class="col-1">
                <label>Text</label>
            </b-col>
            <b-col class="col-5">
                <b-form-input
                    v-model="searchData.textDesignation"
                    placeholder="Enter your text"
                ></b-form-input>
            </b-col>
            <b-col class="col-1">
                <b-form-checkbox
                    v-model="searchData.exactTextDesignation"
                >
                </b-form-checkbox>
            </b-col>
        </b-row>
        <b-row class="mt-2" align-v="center">
            <b-col class="col-1">
                <label>Image object</label>
            </b-col>
            <b-col class="col-5">
                <b-form-input
                    v-model="searchData.imageDesignation"
                    placeholder="Enter Image object "
                ></b-form-input>
            </b-col>
            <b-col class="col-1">
                <b-form-checkbox v-model="searchData.exactImageDesignation">
                </b-form-checkbox>
            </b-col>
        </b-row>
        <b-row class="mt-2" align-v="center">
            <b-col class="col-1">
                <label>Text Reference</label>
            </b-col>
            <b-col class="col-5">
                <b-form-textarea
                    id="textarea"
                    @input="textToArray($event, 'textReference')"
                    placeholder="Enter Text Reference"
                    rows="3"
                    max-rows="6"
                ></b-form-textarea>
            </b-col>
            <b-col class="col-1">
                <b-form-checkbox v-model="searchData.exactTextReference">
                </b-form-checkbox>
            </b-col>
        </b-row>
        <b-row class="mt-2" align-v="center">
            <b-col class="col-1">
                <label>Artefact</label>
            </b-col>
            <b-col class="col-5">
                <b-form-textarea
                    id="textarea"
                    @input="textToArray($event, 'artefactDesignation')"
                    placeholder="Enter artefact"
                    rows="3"
                    max-rows="6"
                ></b-form-textarea>
            </b-col>
            <b-col class="col-1">
                <b-form-checkbox
                    v-model="searchData.exactArtefactDesignation"
                >
                </b-form-checkbox>
            </b-col>
        </b-row>
        <b-button :disabled="noSearch" variant="primary" @click="search()">Search</b-button>
    </div>
</template>
<script lang="ts">
import { DetailedSearchRequestDTO } from '@/dtos/sqe-dtos';
import SearchService from '@/services/search';
import { Component, Emit, Prop, Vue } from 'vue-property-decorator';
import { SearchFormData } from './types';

@Component({
    name: 'search',
})
export default class SearchForm extends Vue {
    private searchService: SearchService = new SearchService();
    private searchData: SearchFormData = new SearchFormData();
    @Prop( { default: false })
    private disabled!: boolean;

    private mounted() {
        this.searchData = new SearchFormData();
    }

    private textToArray(input: string, field: 'textReference' | 'artefactDesignation') {
        this.searchData[field] = input.split('\n');
    }

    private get noSearch() {
        return this.disabled || !this.searchData.textDesignation && !this.searchData.imageDesignation && !this.searchData.textReference && !this.searchData.artefactDesignation;
    }

    @Emit()
    private search() {
        return this.searchData;
    }
}
</script>