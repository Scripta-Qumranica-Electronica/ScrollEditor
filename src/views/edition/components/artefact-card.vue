<template>
    <div class="card">
        <!-- <router-link :to="{ path: `/editions/${editionId}/imaged-objects/${imagedObject.id}` }">
            <img class="card-img-top" v-lazy="imageUrl" v-if="imageUrl" alt="Imaged-Object">
        </router-link> -->
        <artefact-image class="card-img-top" v-if="artefact" :artefact="artefact" :scale="0.05"></artefact-image>
        <label>{{artefact.name}} - {{artefact.side}}</label>
    </div>
</template>

<script lang="ts">
import Vue from 'vue';
import { Artefact } from '@/models/artefact';
import ArtefactImage from '@/views/artefact-editor/artefact-image.vue';

export default Vue.extend({
    name: 'artefact-card',
    components: {
        ArtefactImage,
    },
    props: {
        artefact: Artefact,
    },
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
