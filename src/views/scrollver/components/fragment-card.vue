<template>
    <div class="card">
        <router-link :to="{ path: `/fragment/${scrollVersionId}/${fragment.uniqueId}` }">
            <img class="card-img-top" v-lazy="imageUrl" v-if="imageUrl" alt="Fragment Image">
        </router-link>
        <label>{{artefactsNames}}</label>
        <img class="card-img-top" v-lazy="imageUrl" v-if="imageUrl" alt="Fragment Image">
    </div>
</template>

<script lang="ts">
import Vue from 'vue';
import { Fragment } from '@/models/fragment';

export default Vue.extend({
    name: 'scroll-ver-fragments',
    props: {
        fragment: Fragment,
    },
    computed: {
        imageUrl(): string | undefined {
            if (this.fragment && this.fragment.recto && this.fragment.recto.master) {
                return this.fragment.recto.master.getThumbnailUrl(600);
            }
            return undefined;
        },
        scrollVersionId(): number {
            return this.$store.state.scroll.scrollVersion.versionId;
        },
        artefactsNames(): string {
            const names = this.fragment.artefactRefs.map((a) => a.name);
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
