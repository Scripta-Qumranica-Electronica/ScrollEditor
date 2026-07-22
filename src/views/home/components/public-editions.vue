<template>
    <div>
        <div class="header">
            <b-row>
                 <b-col class="col-4 mt-4 mb-5">
                    <span class="text-edition text-color"
                        >Editions published in the scrollery</span
                    >
                </b-col>
                <b-col class="mt-4 mb-5">
                    <search-bar
                        class="direction"
                        :params="searchBarParams"
                        :model-value="searchValue"
                        @search="onEditionsSearch"
                    ></search-bar>
                </b-col>
            </b-row>
        </div>
        <editions-public-list
            class="p-1"
            :editions="filteredEditions"
            @show-copy-modal="showCopyModal = true"
        ></editions-public-list>
        <!-- TODO(vue3): copy-edition-modal needs to emit 'update:visible' so we can
             reset showCopyModal on dismiss; for now showCopyModal stays true until
             $state.editions.current is cleared externally. -->
        <copy-edition-modal :visible="showCopyModal" />
    </div>
</template>


<script lang="ts">
import { Component, Emit, Vue, Watch, toNative } from 'vue-facing-decorator';
import { EditionInfo } from '@/models/edition';
import { SearchBarParams } from '@/components/search-bar.vue';
import CopyEditionModal from './copy-edition-modal.vue';
import Waiting from '@/components/misc/Waiting.vue';
import SearchBar from '@/components/search-bar.vue';
import EditionsPublicList from './edition-public-list.vue';
import { SearchBarValue } from '@/state/utilities';

@Component({
    name: 'public-editions',
    components: {
        Waiting,
        SearchBar,
        EditionsPublicList,
        CopyEditionModal,
    },
})
class PublicEditions extends Vue {
    public filteredEditions: EditionInfo[] = [];
    public showCopyModal: boolean = false;
    public searchBarParams: SearchBarParams = {
        filter: true,
        sort: true,
        side: false,
    };

    public get searchValue() {
        return this.$state.misc.editionSearchBarValue;
    }

    public set searchValue(newVal: SearchBarValue) {
        this.$state.misc.editionSearchBarValue = newVal;
    }

    @Watch('$state.misc.editionSearchBarValue', {deep: true})
    public onSearchValueChanged() {
        this.onPublicEditionsLoad();
    }

    public onEditionsSearch(newSearch: SearchBarValue) {
        this.searchValue = newSearch;
    }

    @Emit()
    public onPublicEditionsLoad() {
        this.filteredEditions = this.getFilteredEditions();
        return this.filteredEditions.length;
    }

    public async mounted() {
        await this.$state.prepare.allEditions();
        this.onPublicEditionsLoad();
    }

    public getFilteredEditions(): EditionInfo[] {
        // This function is not really efficient, but it does work quickly enough for the editions we have.
        // No need in optimizing it.

        return this.$state.editions.items
            .filter((ed: EditionInfo) => {
                let filter: boolean = ed.isPublic === true;
                // if (this.searchValue.view) {
                //     filter = filter && art.side === this.searchValue.view
                // }
                if (this.searchValue.filter) {
                    filter =
                        filter &&
                        ed.name
                            .toLowerCase()
                            .includes(this.searchValue.filter.toLowerCase());
                }
                return filter;
            })
            .sort((a: EditionInfo, b: EditionInfo) => {

                if (this.searchValue.sort) {
                    let aVal = (a as any)[this.searchValue.sort];
                    let bVal = (b as any)[this.searchValue.sort];

                    if ( 'name' === this.searchValue.sort ) {
                        return aVal.localeCompare( bVal ,   undefined,
                            { numeric: true, sensitivity: 'base' }
                        );

                    } else if ( 'lastEdit' === this.searchValue.sort ) {

                       // for undefined dates, take 01/01/1970 as default
                        if ( undefined === aVal ) {
                            aVal = new Date(1970, 1, 1, 1, 1, 1);
                        }
                        if ( undefined === bVal ) {
                            bVal = new Date(1970, 1, 1, 1, 1, 1);
                        }
                        return ((aVal > bVal) ? -1 :  1 );

                    } else {
                        return ((aVal > bVal) ? 1 : -1 );
                    }

                } else {
                    return 1;
                }
            });
    }
}
export default toNative(PublicEditions);
</script>


<style lang="scss" scoped>
@import '@/assets/styles/_variables.scss';
@import '@/assets/styles/_fonts.scss';

.direction {
    float: right;
}

.text-edition {
    font-style: $font-style;
    font-weight: $font-weight-1;
    font-size: $font-size-3;
    font-family: $font-family;
    overflow-x: hidden;
}
.scroll-bar {
    overflow-y: auto;
    max-height: calc(100vh - 240px);
}
</style>
