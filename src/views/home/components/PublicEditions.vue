<template>
    <div>
        <div class="header">
            <b-row>
                <b-col class="mt-4 mb-5">
                    <search-bar
                        class="direction"
                        :params="searchBarParams"
                        :defaultValue="defaultSearchValue"
                        @on-search="onEditionsSearch($event)"
                    ></search-bar>
                </b-col>
            </b-row>
        </div>
        <div>
            <editions-public-list
                class="text-edition"
                :editions="filteredEditions"
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
    private filteredEditions: EditionInfo[] = [];
    private defaultSearchValue: SearchBarValue = {sort: 'lastEdit'};
    private searchValue: SearchBarValue = {};
    private searchBarParams: SearchBarParams = {
        filter: true,
        sort: true,
    };

    public onEditionsSearch(event: SearchBarValue) {
        this.searchValue = event;
        this.onPublicEditionsLoad();
    }
    @Emit()
    public onPublicEditionsLoad() {
        this.filteredEditions = this.getFilteredEditions();
        return this.filteredEditions.length;
    }
    protected async mounted() {
        await this.$state.prepare.allEditions();
        this.onPublicEditionsLoad();
    }

    private getFilteredEditions(): EditionInfo[] {
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
                    return (a as any)[this.searchValue.sort] >
                        (b as any)[this.searchValue.sort]
                        ? 1
                        : -1;
                } else {
                    return 1;
                }
            });
    }
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
</style>
