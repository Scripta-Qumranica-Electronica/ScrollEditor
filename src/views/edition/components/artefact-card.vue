<template>
    <router-link
        :to="{ path: `/editions/${editionId}/artefacts/${artefact.id}` }"
    >
        <artefact-image
            class="card-img-top"
            v-show="artefact"
            :artefact="artefact"
        ></artefact-image>
        <label>{{ artefact.name }} - {{ artefact.side }}</label>
    </router-link>
</template>

<script lang="ts">
import Vue from 'vue';
import { Artefact } from '@/models/artefact';
import ArtefactImage from '@/components/artefact/artefact-image.vue';

export default Vue.extend({
    name: 'artefact-card',
    components: {
        ArtefactImage,
    },
    props: {
        artefact: Object as () => Artefact,
    },
    computed: {
        editionId(): number {
            return parseInt(this.$route.params.editionId);
        },
    },
});
</script>

<style lang="scss">
div.card {
    margin-bottom: 20px;

    img {
        cursor: pointer;
    }
    .card-img-top svg
     {
        margin: 33px 33px 0px 33px;
        width: calc(92% - 33px);
    }
}
</style>
