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
                        :defaultValue="defaultSearchValue"
                        @search="onEditionsSearch($event)"
                    ></search-bar>
                </b-col>
            </b-row>
        </div>
        <div class="scroll-bar">
            <editions-public-list
                class="text-edition"
                :editions="publicEditions"
            ></editions-public-list>
        </div>
    </div>
</template>


<script lang="ts">
import { Component, Emit, Prop, Vue } from 'vue-property-decorator';
import { EditionInfo } from '@/models/edition';
import { SearchBarParams, SearchBarValue } from '@/components/search-bar.vue';

import Waiting from '@/components/misc/Waiting.vue';
import SearchBar from '@/components/search-bar.vue';
import EditionsPublicList from './EditionsPublicList.vue';

@Component({
    name: 'public-editions',
    components: {
        Waiting,
        SearchBar,
        EditionsPublicList,
    },
})
export default class PublicEditions extends Vue {
    private publicEditions: EditionInfo[] = [];
    private defaultSearchValue: SearchBarValue = { sort: 'lastEdit' };
    private searchValue: SearchBarValue = {};
    private searchBarParams: SearchBarParams = {
        filter: true,
        sort: true,
    };

    public onEditionsSearch(event: SearchBarValue) {
        this.searchValue = event;
        this.filterEditions();
    }

    @Emit()
    public onPublicEditionsLoad() {
        this.publicEditions = this.getPublicEditions();
        return this.publicEditions.length;
    }

    protected async mounted() {
        await this.$state.prepare.allEditions();
        this.onPublicEditionsLoad();
        for (const edition of this.publicEditions) {
            edition.filtered = false;
        }
    }

    private getPublicEditions() {
        return this.$state.editions.items
            .filter(ed => ed.isPublic)
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

    private filterEditions() {
        for (const edition of this.publicEditions) {
            edition.filtered = !!this.searchValue.filter && !edition.name.toLowerCase().includes(this.searchValue.filter.toLowerCase());
        }
    }
    /*private getFilteredEditions(): EditionInfo[] {
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
            });
    } */
}
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
}
.scroll-bar {
    overflow-y: auto;
    max-height: calc(100vh - 240px);
}
</style>
