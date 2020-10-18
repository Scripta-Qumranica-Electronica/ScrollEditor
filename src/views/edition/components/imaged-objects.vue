<template>
    <div>
        <div class="header">
            <b-row>
                <b-col class="mb-3">
                    <search-bar
                        class="direction"
                        :params="searchBarParams"
                        @on-search="onImagedObjectsSearch($event)"
                    ></search-bar>
                </b-col>
            </b-row>
        </div>
        <div>
            <ul class="list-unstyled row mt-2"  v-if="imagedObjects.length">
                <li class="col-sm-12 col-md-6 col-xl-4 list-item"
                    v-for="imagedObject in imagedObjects"
                    :key="imagedObject.id">
                    <imaged-object-card :imaged-object="imagedObject"></imaged-object-card>
                </li>
            </ul>
        </div>
    </div>
</template>

<script lang="ts">
import Vue from 'vue';
import Waiting from '@/components/misc/Waiting.vue';
import ImagedObjectCard from './imaged-object-card.vue';
import { ImagedObject } from '@/models/imaged-object';
import SearchBar from '@/components/search-bar.vue';
import { SearchBarParams, SearchBarValue } from '@/components/search-bar.vue';

export default Vue.extend({
    components: {
        ImagedObjectCard,
        Waiting,
        SearchBar,
    },
    computed: {
        imagedObjects(): ImagedObject[] {
            return this.$state.imagedObjects.items;
        }
    },
    methods:{
        onImagedObjectsSearch(event) {

        }
    },
    created() {
        this.$state.prepare.edition(this.$state.editions.current!.id);
    }
});
</script>
<style scoped>
/* .card{
    display: inline-block;
    width: calc(25% - 20px);
    margin: 10px;
} */
.direction{
    float: right;
    margin-top: -67px;
}
</style>