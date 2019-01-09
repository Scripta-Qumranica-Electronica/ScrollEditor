<template>
    <div class="card">
        <router-link :to="{ path: `/fragment/${scrollVersionId}/${fragment.uniqueId}` }">
            <img class="card-img-top" v-lazy="imageUrl" v-if="imageUrl" alt="Fragment Image">
            <--! This shows the back too -->
            <img class="card-img-top" v-lazy="imageRevUrl" v-if="imageRevUrl" alt="Fragment Image">
        </router-link>
        <label>{{artefactsNames}}</label>
    </div>
</template>

<script lang="ts">
import Vue from 'vue';
import { Fragment } from '@/models/fragment';

export default Vue.extend({
    // This component had the same name as its parent.
    // I would highly recommend ommitting the name attribute,
    // then the component will take its name from its filename.
    // I would also use the filename format FragmentCard.
    // If you do this, then debugging with Vue Devtools becomes far easier.
    name: 'scroll-ver-fragment-card',  
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
        // Now we can see the back too.
        imageRevUrl(): string | undefined {
            if (this.fragment && this.fragment.verso && this.fragment.verso.master) {
                return this.fragment.verso.master.getThumbnailUrl(600);
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
