<template>
    <div class="card">
        <router-link :to="{ path: `/editions/${editionId}/artefacts/${artefact.id}` }">
            <artefact-image class="card-img-top" v-if="artefact" :artefact="artefact" :scale="0.05"></artefact-image>
        </router-link>
        <label>{{artefact.name}} - {{artefact.side}}</label>
    </div>
</template>

<script lang="ts">
import Vue from 'vue';
import { Artefact } from '@/models/artefact';
import ArtefactImage from '../../artefact-editor/artefact-image.vue';

export default Vue.extend({
    name: 'artefact-card',
    components: {
        ArtefactImage,
    },
    props: {
        artefact: Artefact,
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
