<template>
    <b-form inline class="" @submit.prevent>
        <b-form-group v-if="params.filter">
            <label for="filter" class="search-bar mb-2">{{
                $t('home.filter')
            }}</label>
            <b-form-input
                id="filter"
                @change="onFilterChange($event)"
            ></b-form-input>
        </b-form-group>
        <b-form-group v-if="params.view">
            <label for="view" class="search-bar ml-2  mb-2">{{
                $t('home.view')
            }}</label>
            <b-form-select
                name="view"
                class="ml-2"
                @change="onViewChange($event)"
            >
                <b-form-select-option value="recto and verso"
                    >Both</b-form-select-option
                >
                <b-form-select-option value="recto"
                    >Recto</b-form-select-option
                >
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
                :value="null"
                @change="onSortChange($event)"
            >
                <b-form-select-option :value="null"
                    >Please select an option</b-form-select-option
                >
                <b-form-select-option value="lastEdit"
                    >Last Edited</b-form-select-option
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
    private searchValue: SearchBarValue = {
         
    };
    @Prop({
        default: () => ({
            filter: false,
            view: false,
            sort: false,
        }),
    })
    public params!: SearchBarParams;
 
    public onFilterChange(inputEvent) {
        console.log(inputEvent);
        this.searchValue.filter = inputEvent;
        this.onSearch();
    }

    public onViewChange(viewEvent) {
         this.searchValue.view = viewEvent;
        this.onSearch();
    }

    public onSortChange(selectEvent) {
        console.log(selectEvent);
        this.searchValue.sort = selectEvent;
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
</style>