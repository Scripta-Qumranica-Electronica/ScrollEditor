<template>
    <div>
        <div class="header">
            <b-row>
                <b-col class="col-4 mt-4 mb-5">
                    <span class="text-edition text-color"
                        >Editions you are currently working on
                        or have previously published</span
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
            <edition-list
                title="Draft"
                class="text-edition"
                :editions="draftEditions"
            ></edition-list>
        </div>
        <div class="edition-list">
            <edition-list
                title="Published"
                class="text-edition"
                :editions="publishedEditions"
            ></edition-list>
        </div>
    </div>
</template>


<script lang="ts">
import { Component, Emit, Prop, Vue } from 'vue-property-decorator';
import { EditionInfo } from '@/models/edition';
import { SearchBarParams, SearchBarValue } from '@/components/search-bar.vue';

import Waiting from '@/components/misc/Waiting.vue';
import SearchBar from '@/components/search-bar.vue';
import EditionList from './EditionList.vue';

@Component({
    name: 'personal-editions',
    components: {
        Waiting,
        SearchBar,
        EditionList,
    },
})
export default class PersonalEditions extends Vue {
    private filteredEditions: EditionInfo[] = [];
    private defaultSearchValue: SearchBarValue = {sort: 'lastEdit'};
    private searchValue: SearchBarValue = {};
    private searchBarParams: SearchBarParams = {
        filter: true,
        sort: true,
        view: false,
    };

    public onEditionsSearch(event: SearchBarValue) {
        this.searchValue = event;
        this.onPersonalEditionsLoad();
    }

    @Emit()
    public onPersonalEditionsLoad() {
        this.filteredEditions = this.getFilteredEditions();
        return this.filteredEditions.length;
    }

    protected async mounted() {
        await this.$state.prepare.allEditions();
        this.onPersonalEditionsLoad();
    }

    private getFilteredEditions(): EditionInfo[] {
        return this.$state.editions.items
            .filter((ed: EditionInfo) => {
                let filter: boolean = ed.mine === true;
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

    private get draftEditions(): EditionInfo[] {
        return this.filteredEditions.filter((ed) => !ed.isPublic);
    }

    private get publishedEditions(): EditionInfo[] {
        return this.filteredEditions.filter((ed) => ed.isPublic);
    }
}
</script>


<style lang="scss" scoped>
@import '@/assets/styles/_variables.scss';
@import '@/assets/styles/_fonts.scss';

.direction {
    float: right;
}
.text-color {
    color: $black;
}
.text-edition {
    font-style: $font-style;
    font-weight: $font-weight-1;
    font-size: $font-size-3;
    font-family: $font-family;
}
.edition-list {
    padding-top: 70px;
}
.scroll-bar {
    overflow-y: auto;
    max-height: calc(100vh - 240px);
}
</style>
