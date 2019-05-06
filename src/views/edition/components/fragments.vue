<template>
    <div>
        <div class="row" v-if="!imagedObjects"><div class="col ml-auto"><Waiting></Waiting></div></div>
       <div v-if="imagedObjects">
            <div class="row"><div class="col">
                <small>{{ $t('home.imagedObjects') }}: {{ imagedObjects.length }}</small>
            </div></div>
            <ul class="list-unstyled row mt-2"  v-if="imagedObjects.length">
                <li class="col-sm-12 col-md-6 col-xl-4 list-item"
                    v-for="fragment in imagedObjects"
                    :key="fragment.id">
                    <fragment-card :fragment="fragment"></fragment-card>
                </li>
            </ul>
        </div>
    </div>
</template>

<script lang="ts">
import Vue from 'vue';
import Waiting from '@/components/misc/Waiting.vue';
import FragmentCard from './fragment-card.vue';
import { ImagedObjectDetailed, ImagedObjectSimple } from '@/models/imagedObject';
import EditionService from '@/services/edition';

export default Vue.extend({
    name: 'edition-ver-imagedObjects',
    data() {
        return {
            editionService: new EditionService(this.$store),
        };
    },
    components: {
        FragmentCard,
        Waiting,
    },
    computed: {
        imagedObjects(): ImagedObjectSimple[] | null {
            return this.$store.state.edition.imagedObjects;
        }
    },
    mounted() {
        this.editionService.fetchEditionImagedObjects();
    }
});
</script>