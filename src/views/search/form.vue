<template>
    <div>
        <b-row class="mt-5" align-v="center">
            <b-col class="col-2">
                <label>Edition</label>
            </b-col>
            <b-col class="col-5">
                <b-form-input
                    v-model="searchData.textDesignation"
                    placeholder="Manuscript/text number, e.g., 3Q4"
                ></b-form-input>
            </b-col>
            <b-col class="col-1">
                <b-form-checkbox
                    v-model="searchData.exactTextDesignation"
                    v-b-tooltip.hover.right="'Exact search'"
                >
                </b-form-checkbox>
            </b-col>
        </b-row>
        <b-row class="mt-2" align-v="center">
            <b-col class="col-2">
                <label>Imaged Object</label>
            </b-col>
            <b-col class="col-5">
                <b-form-input
                    v-model="searchData.imageDesignation"
                    placeholder="IAA-Plate(-Fragment).   e.g. IAA-1093-1"
                ></b-form-input>
            </b-col>
            <b-col class="col-1">
                <b-form-checkbox
                    v-model="searchData.exactImageDesignation"
                    v-b-tooltip.hover.right="'Exact search'"
                >
                </b-form-checkbox>
            </b-col>
        </b-row>
        <b-row class="mt-2" align-v="center">
            <b-col class="col-2">
                <label>Text Fragment</label>
            </b-col>
            <b-col class="col-5">
                <b-form-textarea
                    id="textarea"
                    @update:model-value="textToArray($event, 'textReference')"
                    placeholder="Designation for a portion of text, e.g., Frg. 134"
                    rows="3"
                    max-rows="6"
                ></b-form-textarea>
            </b-col>
            <b-col class="col-1">
                <b-form-checkbox
                    v-model="searchData.exactTextReference"
                    v-b-tooltip.hover.right="'Exact search'"
                >
                </b-form-checkbox>
            </b-col>
        </b-row>
        <b-row class="mt-2" align-v="center">
            <b-col class="col-2">
                <label>Artefact</label>
            </b-col>
            <b-col class="col-5">
                <b-form-textarea
                    id="textarea"
                    @update:model-value="textToArray($event, 'artefactDesignation')"
                    placeholder="Designation for a manuscript fragment, e.g., Frg. 134"
                    rows="3"
                    max-rows="6"
                ></b-form-textarea>
            </b-col>
            <b-col class="col-1">
                <b-form-checkbox
                    v-model="searchData.exactArtefactDesignation"
                    v-b-tooltip.hover.right="'Exact search'"
                >
                </b-form-checkbox>
            </b-col>
        </b-row>
        <b-row>
            <b-col class="col-2"> </b-col>
            <b-col class="col-5">
                <b-button
                    :disabled="noSearch"
                    variant="primary"
                    block
                    @click="search()"
                >
                    Search
                </b-button>

            </b-col>
            <b-col class="col-2"> </b-col>
        </b-row>
    </div>
</template>
<script lang="ts">
import { DetailedSearchRequestDTO } from '@/dtos/sqe-dtos';
import SearchService from '@/services/search';
import { Component, Emit, Prop, Vue, toNative } from 'vue-facing-decorator';
import { vBTooltip } from 'bootstrap-vue-next';
import { SearchFormData } from './types';
import Waiting from '@/components/misc/Waiting.vue';
@Component({
    name: 'search',
    directives: {
        'b-tooltip': vBTooltip,
    },
})
class SearchForm extends Vue {
    public searchService: SearchService = new SearchService();
    public searchData: SearchFormData = new SearchFormData();
    @Prop({ default: false })
    public disabled!: boolean;

    public mounted() {
        this.searchData = new SearchFormData();
    }

    public textToArray(
        input: string,
        field: 'textReference' | 'artefactDesignation'
    ) {
        const list = input.split('\n').filter((s) => !!s); // Remove empty items from the list
        this.searchData[field] = list;
    }

    public get noSearch() {
        return (
            this.disabled ||
            (!this.searchData.textDesignation &&
                !this.searchData.imageDesignation &&
                !this.searchData.textReference?.length &&
                !this.searchData.artefactDesignation?.length)
        );
    }

    @Emit()
    public search() {
        return this.searchData;
    }
}
export default toNative(SearchForm);
</script>

<style lang="scss" scoped>
@import '@/assets/styles/_variables.scss';
@import '@/assets/styles/_fonts.scss';

label,
button {
    font-style: $font-style;
    font-weight: $font-weight-1;
    font-size: $font-size-3;
    font-family: $font-family;
}

button {
    margin: 2rem 0;
}
</style>
