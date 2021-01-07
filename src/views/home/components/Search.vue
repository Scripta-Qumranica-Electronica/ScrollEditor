<template>
    <div>
        <b-row class="mt-5" align-v="center">
            <b-col class="col-1">
                <label>Text</label>
            </b-col>
            <b-col class="col-5">
                <b-form-input
                    v-model="searchParams.textDesignation"
                    placeholder="Enter your text"
                ></b-form-input>
            </b-col>
            <b-col class="col-1">
                <b-form-checkbox
                    v-model="searchParams.exactTextDesignation"
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
                    v-model="searchParams.imageDesignation"
                    placeholder="Enter Image object "
                ></b-form-input>
            </b-col>
            <b-col class="col-1">
                <b-form-checkbox v-model="searchParams.exactImageDesignation">
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
                <b-form-checkbox v-model="searchParams.exactTextReference">
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
                    v-model="searchParams.exactArtefactDesignation"
                >
                </b-form-checkbox>
            </b-col>
        </b-row>
        <b-button variant="primary" @click="search()">Search</b-button>
    </div>
</template>
<script lang="ts">
import { DetailedSearchRequestDTO } from '@/dtos/sqe-dtos';
import SearchService from '@/services/search';
import { Component, Prop, Vue } from 'vue-property-decorator';

@Component({
    name: 'search',
})
export default class Search extends Vue {
    public searchService: SearchService = new SearchService();
    public searchParams: any = {};
    public async search() {
        await this.searchService.search(this.searchParams);
    }

    private textToArray(event: any, field: string) {
        this.searchParams[field] = event.split('\n');
    }
}
</script>