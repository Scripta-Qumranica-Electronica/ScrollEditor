<template>
    <div>
        <div class="header">
            <b-row>
                <b-col class="mb-3">
                    <search-bar
                        class="direction"
                        :params="searchBarParams"
                        :model-value="searchValue"
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
import { Component, Prop, Emit, Vue, toNative } from 'vue-facing-decorator';

import Waiting from '@/components/misc/Waiting.vue';
import ImagedObjectCard from './imaged-object-card.vue';
import { ImagedObject } from '@/models/imaged-object';
import SearchBar from '@/components/search-bar.vue';
import { SearchBarParams } from '@/components/search-bar.vue';
import { SearchBarValue } from '@/state/utilities';

@Component({
    name: 'imaged-objects',
    components: {
        ImagedObjectCard,
        Waiting,
        SearchBar,
    },
})
class ImagedObjects extends Vue {
    public filteredImagedObjects: ImagedObject[] = [];
    public searchValue: SearchBarValue = {};
    public searchBarParams: SearchBarParams = {
        filter: true,
        sort: false,
        side: false,
    };
    public get imagedObjects(): ImagedObject[] {
        return this.$state.imagedObjects!.items!;
    }

    public async mounted() {
        this.filteredImagedObjects = this.getFilteredImagedObjects();
   }

    public async created() {
        // Read the id from the route so this works on direct navigation, before
        // the parent edition view has set editions.current.
        const editionId =
            parseInt(String(this.$route.params.editionId), 10) ||
            this.$state.editions.current!.id;
        await this.$state.prepare.edition(editionId);
        // Imaged objects are loaded lazily (not on edition open); this view needs them.
        await this.$state.prepare.imagedObjects(editionId);
        this.filteredImagedObjects = this.getFilteredImagedObjects();
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
export default toNative(ImagedObjects);
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
