<template>
    <div class="card">
        <router-link :to="{ path: `/editions/${editionId}/artefacts/${artefact.id}` }">
            <simple-artefact-image class="card-img-top" v-show="artefact" :artefact="artefact"></simple-artefact-image>
        </router-link>
        <label>{{artefact.name}} - {{artefact.side}}</label>
    </div>
</template>

<script lang="ts">
import Vue from 'vue';
import { Artefact } from '@/models/artefact';
import SimpleArtefactImage from './simple-artefact-image.vue';

export default Vue.extend({
    name: 'artefact-card',
    components: {
        SimpleArtefactImage,
    },
    props: {
        artefact: Object as () => Artefact,
    },
    computed: {
        editionId(): number {
            return parseInt(this.$route.params.editionId);
        },
    }
});
</script>

<style lang="scss" scoped>
div.card {
    margin-bottom: 20px;

    img {
        cursor: pointer;
    }
}
</style>
