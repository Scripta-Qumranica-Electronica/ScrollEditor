<template>
    <div>
        <div class="header">
            <b-row>
            </b-row>
        </div>
        <div class="scroll-bar">
            <ul class="list-unstyled row mt-2" v-if="imagedObjects.length">
                <li
                    class="col-sm-12 col-md-6 col-xl-4 list-item"
                    v-for="imagedObject in imagedObjects"
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
        SearchBar
    }
})

export default class ImagedObjects extends Vue {

    // computed
    public get imagedObjects(): ImagedObject[] {
        return this.$state.imagedObjects!.items!;
    }

    // methods
    // onImagedObjectsSearch(event) {}

    protected async created() {
        const editionId = this.$state.editions.current!.id;
        await this.$state.prepare.edition(editionId);
        // await this.$state.prepare.edition(this.$state.editions.current!.id);
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