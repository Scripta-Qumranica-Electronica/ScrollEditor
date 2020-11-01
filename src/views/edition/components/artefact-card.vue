<template>
    <router-link
        :to="{ path: `/editions/${editionId}/artefacts/${artefact.id}` }"
    >
        <artefact-image
            class="card-img-top"
            v-show="artefact"
            :artefact="artefact"
        ></artefact-image>
        <label class="side-edition"
            >{{ artefact.name }} - {{ artefact.side }}</label
        >
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
@import '@/assets/styles/_variables.scss';
@import '@/assets/styles/_fonts.scss';
div.card {
    margin-bottom: 20px;

    img {
        cursor: pointer;
    }
    .card-img-top svg {
        margin: 33px 33px 0px 33px;
        width: calc(92% - 33px);
    }
    .side-edition {
        width: 100%;
        text-align: center;
        font-style: $font-style;
        font-weight: $font-weight-3;
        font-size: $font-size-2;
        font-family: $font-family;
        color: $black;
    }
}
</style>
