<template>
    <b-form inline class="" @submit.prevent>
        <b-form-group v-if="params.filter">
            <label for="filter" class="search-bar mb-2">{{
                $t('home.filter')
            }}</label>
            <b-form-input
                id="filter"
                v-model="internalValue.filter"
                @input="onFilterChange($event)"
            ></b-form-input>
        </b-form-group>
        <b-form-group v-if="params.side">
            <label for="side" class="search-bar ml-2 mb-2">{{
                $t('home.side')
            }}</label>
            <b-form-select
                name="side"
                class="ml-2 size"
                v-model="internalValue.side"
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
                v-model="internalValue.sort"
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
import { SearchBarValue } from '@/state/utilities';
import { Component, Emit, Prop, Vue, Watch } from 'vue-property-decorator';

// At some point we need to make those a little nicer
export interface SearchBarParams {
    filter?: boolean;
    side?: boolean;
    sort?: boolean;
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

    @Prop()
    public value!: SearchBarValue;

    public internalValue: SearchBarValue = {};

    public mounted() {
        this.internalValue = {...this.value};
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

    @Watch('value')
    private onValueParamChange(newValueParam: SearchBarValue) {
        this.internalValue = {...this.value};
    }

    @Emit('search')
    private onSearch() {
        this.internalValue = {...this.internalValue};
        return this.internalValue;
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