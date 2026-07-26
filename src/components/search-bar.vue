<template>
    <b-form class="" @submit.prevent>
        <b-form-group v-if="params.filter">
            <label for="filter" class="search-bar mb-2">{{
                $t('home.filter')
            }}</label>
            <b-form-input
                id="filter"
                v-model="internalValue.filter"
                @update:model-value="onFilterChange($event)"
            ></b-form-input>
        </b-form-group>
        <b-form-group v-if="params.side">
            <label for="side" class="search-bar ms-2 mb-2">{{
                $t('home.side')
            }}</label>
            <b-form-select
                name="side"
                class="ms-2 size"
                v-model="internalValue.side"
                @update:model-value="onViewChange($event)"
            >
                <b-form-select-option value="recto and verso"
                    >Both</b-form-select-option
                >
                <b-form-select-option value="recto">Recto</b-form-select-option>
                <b-form-select-option value="verso">Verso</b-form-select-option>
            </b-form-select>
        </b-form-group>
        <b-form-group v-if="params.sort">
            <label for="sort" class="search-bar ms-2 mb-2">{{
                $t('home.sort')
            }}</label>
            <b-form-select
                name="sort"
                class="ms-2"
                v-model="internalValue.sort"
                @update:model-value="onSortChange($event)"
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
import { Component, Emit, Prop, Vue, Watch, toNative } from 'vue-facing-decorator';

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
class SearchBar extends Vue {
    @Prop({
        default: () => ({
            filter: false,
            view: false,
            sort: false,
        }),
    })
    public params!: SearchBarParams;

    // Vue 3: prop renamed from 'value' to 'modelValue' for v-model support
    @Prop()
    public modelValue!: SearchBarValue;

    public internalValue: SearchBarValue = {};

    public mounted() {
        this.internalValue = {...this.modelValue};
        this.onSearch();
    }

    // The arg (the new bvn model value) is unused — we just re-emit the current
    // internalValue via onSearch. Typed `unknown` so bvn's model-value types fit.
    public onFilterChange(_inputEvent?: unknown) {
        this.onSearch();
    }

    public onViewChange(_viewEvent?: unknown) {
        this.onSearch();
    }

    public onSortChange(_selectEvent?: unknown) {
        this.onSearch();
    }

    @Watch('modelValue')
    public onValueParamChange(newValueParam: SearchBarValue) {
        this.internalValue = {...this.modelValue};
    }

    @Emit('search')
    public onSearch() {
        this.internalValue = {...this.internalValue};
        return this.internalValue;
    }
}
export default toNative(SearchBar);
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
