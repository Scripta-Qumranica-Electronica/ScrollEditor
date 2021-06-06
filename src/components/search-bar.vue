<template>
    <b-form inline class="" @submit.prevent>
        <b-form-group v-if="params.filter">
            <label for="filter" class="search-bar mb-2">{{
                $t('home.filter')
            }}</label>
            <b-form-input
                id="filter"
                v-model="searchValue.filter"
                @input="onFilterChange($event)"
            ></b-form-input>
        </b-form-group>
        <b-form-group v-if="params.view">
            <label for="view" class="search-bar ml-2 mb-2">{{
                $t('home.view')
            }}</label>
            <b-form-select
                name="view"
                class="ml-2 size"
                v-model="searchValue.view"
                @change="onViewChange($event)"
            >
                <b-form-select-option value="recto and verso"
                    >Both</b-form-select-option
                >
                <b-form-select-option value="recto">Recto</b-form-select-option>
                <b-form-select-option value="verso">Verso</b-form-select-option>
            </b-form-select>
        </b-form-group>
        <b-form-group v-if="params.sort">
            <label for="sort" class="search-bar ml-2 mb-2">{{
                $t('home.sort')
            }}</label>
            <b-form-select
                name="sort"
                class="ml-2"
                v-model="searchValue.sort"
                @change="onSortChange($event)"
            >
                <!-- <b-form-select-option :value="null"
                    >Please select an option</b-form-select-option
                > -->
                <b-form-select-option value="lastEdit"
                    >Date</b-form-select-option
                >
                <b-form-select-option value="name">Name</b-form-select-option>
            </b-form-select>
        </b-form-group>
    </b-form>
</template>

<script lang="ts">
import { Component, Emit, Prop, Vue } from 'vue-property-decorator';

export interface SearchBarParams {
    filter?: boolean;
    view?: boolean;
    sort?: boolean;
}

export interface SearchBarValue {
    filter?: string;
    view?: string;
    sort?: string;
}

@Component({
    name: 'search-bar',
    components: {},
})
export default class SearchBar extends Vue {
    @Prop({
        default: () => ({
            filter: false,
            view: false,
            sort: false,
        }),
    })
    public params!: SearchBarParams;

    @Prop({
        default: () => ({}),
    })
    private defaultValue!: SearchBarValue;

    private searchValue: SearchBarValue = {};

    public mounted() {
        this.searchValue = {...this.defaultValue};
        this.onSearch();
    }

    public onFilterChange(inputEvent: string | undefined) {
        this.onSearch();
    }

    public onViewChange(viewEvent: string | undefined) {
        this.onSearch();
    }

    public onSortChange(selectEvent: string | undefined) {
        this.onSearch();
    }

    @Emit()
    private onSearch() {
        return this.searchValue;
    }
}
</script>
<style lang="scss" scoped>
@import '@/assets/styles/_variables.scss';
@import '@/assets/styles/_fonts.scss';

.search-bar {
    font-style: $font-style;
    font-weight: $font-weight-1;
    font-size: $font-size-1;
    font-family: $font-family;
    color: $black;
    justify-content: inherit;
}
.size {
    width: 200px !important;
}
</style>