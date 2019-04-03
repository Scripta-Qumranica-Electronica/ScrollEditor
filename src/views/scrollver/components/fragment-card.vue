<template>
    <div class="card">
        <router-link :to="{ path: `/fragment/${scrollVersionId}/${fragment.uniqueId}` }">
            <img class="card-img-top" v-lazy="imageUrl" v-if="imageUrl" alt="Fragment Image">
        </router-link>
        <label>{{artefactsNames}}</label>
    </div>
</template>

<script lang="ts">
import Vue from 'vue';
import { Fragment, ImagedFragment } from '@/models/fragment';

export default Vue.extend({
    name: 'scroll-ver-fragments',
    props: {
        fragment: ImagedFragment,
    },
    computed: {
        imageUrl(): string | undefined {
            // TODO
            if (this.fragment && this.fragment.recto && this.fragment.recto.masterIndex) {
                return this.fragment.recto.masterIndex.getThumbnailUrl(600);
            }
            return undefined;
        },
        scrollVersionId(): number {
            return this.$store.state.scroll.scrollVersion.versionId;
        },
        artefactsNames(): string {
            // TODO
            const names = this.fragment.artefacts.map((a) => a.name);
            // const names = this.fragment.artefactRefs.map((a) => a.name);
            const unique = [...new Set(names)]; // Taken from here: https://stackoverflow.com/a/42123984/871910
            return unique.join(', ');
        }
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
