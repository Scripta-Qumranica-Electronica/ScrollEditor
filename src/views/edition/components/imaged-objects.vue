<template>
    <div>
        <div class="header">
            <b-row>
                <b-col class="mb-3">
                    <search-bar
                        class="direction"
                        :params="searchBarParams"
                        :value="searchValue"
                        @search="onImagedObjectsSearch($event)"
                    ></search-bar>
                </b-col>
            </b-row>
        </div>
        <div class="scroll-bar">
            <ul class="list-unstyled row mt-2" v-if="filteredImagedObjects.length">
                <li
                    class="col-sm-12 col-md-6 col-xl-4 list-item"
                    v-for="imagedObject in filteredImagedObjects"
                    :key="imagedObject.id"
                >
                    <imaged-object-card
                        :imaged-object="imagedObject"
                    ></imaged-object-card>
                </li>
            </ul>
        </div>
    </div>
</template>

<script lang="ts">
import { Component, Prop, Emit, Vue } from 'vue-property-decorator';

import Waiting from '@/components/misc/Waiting.vue';
import ImagedObjectCard from './imaged-object-card.vue';
import { ImagedObject } from '@/models/imaged-object';
import SearchBar from '@/components/search-bar.vue';
import { SearchBarParams, SearchBarValue } from '@/components/search-bar.vue';

@Component({
    name: 'imaged-objects',
    components: {
        ImagedObjectCard,
        Waiting,
        SearchBar,
    },
})
export default class ImagedObjects extends Vue {
    public filteredImagedObjects: ImagedObject[] = [];
    public searchValue: SearchBarValue = {};
    public searchBarParams: SearchBarParams = {
        filter: true,
        sort: false,
        view: false,
    };
    public get imagedObjects(): ImagedObject[] {
        return this.$state.imagedObjects!.items!;
    }

    protected async mounted() {
        this.filteredImagedObjects = this.getFilteredImagedObjects();
   }

    protected async created() {
        const editionId = this.$state.editions.current!.id;
        await this.$state.prepare.edition(editionId);
        // await this.$state.prepare.edition(this.$state.editions.current!.id);
    }

    public onImagedObjectsSearch(searchEvent: SearchBarValue) {
        this.searchValue = searchEvent;
        this.filteredImagedObjects = this.getFilteredImagedObjects();
    }

    public getFilteredImagedObjects(): ImagedObject[] {
        return this.imagedObjects
            .filter((img: ImagedObject) => {
                let filter = true;

                // if (
                //     this.searchValue.view &&
                //     this.searchValue.view !== 'recto and verso'
                // ) {
                //     filter = filter && (this.searchValue.view === 'recto' && !!img.recto) || (this.searchValue.view === 'verso' && !!img.verso);
                // }
                if (
                    this.searchValue.filter
                    ) {
                    filter =
                        filter &&
                        img.name
                            .toLowerCase()
                            .includes(this.searchValue.filter.toLowerCase());
                }

                return filter;
            })
            .sort((a: ImagedObject, b: ImagedObject) => {
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
<style scoped>
.direction {
    float: right;
    margin-top: -67px;
}
.scroll-bar {
    max-height: calc(100vh - 80px);
    overflow-y: auto;
    overflow-x: hidden;
    height: 60vh;
}
</style>