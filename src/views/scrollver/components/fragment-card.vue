<template>
    <div class="card">
        <router-link :to="{ path: `/fragment/${scrollVersionId}/${fragment.id}` }">
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
            if (this.fragment && this.fragment.recto && this.fragment.recto.color) {
                return this.fragment.recto.color.getThumbnailUrl(800);
            }
            return undefined;
        },
        scrollVersionId(): number {
            return this.$store.state.scroll.scrollVersion.versionId;
        },
        artefactsNames(): string {
            let names = '';
            for (var i = 0 ; i < this.fragment.artefacts.length; i++) {
                if (names === '') {
                    names = this.fragment.artefacts[i].name;
                }
                else if (!names.includes(this.fragment.artefacts[i].name)) {
                    names += ', ' + this.fragment.artefacts[i].name;
                }
            }
            return names;
        }
    }
});
</script>

<style lang="scss" scoped>
div.card img {
    cursor: pointer;
}
</style>
