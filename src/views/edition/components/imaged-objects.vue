<template>
    <div>
        <div class="row" v-if="!imagedObjects"><div class="col ml-auto"><Waiting></Waiting></div></div>
        <div v-if="imagedObjects">
            <div class="row"><div class="col">
                <small>{{ $t('home.imagedObjects') }}: {{ imagedObjects.length }}</small>
            </div></div>
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

export default Vue.extend({
    components: {
        ImagedObjectCard,
        Waiting,
    },
    computed: {
        imagedObjects(): ImagedObject[] {
            return this.$state.imagedObjects.items;
        }
    },
    created() {
        this.$state.prepare.edition(this.$state.editions.current!.id);
    }
});
</script>
<style scoped>
ul.list-unstyled {
       height: calc(100vh - 123px);
    overflow: auto;
}
</style>