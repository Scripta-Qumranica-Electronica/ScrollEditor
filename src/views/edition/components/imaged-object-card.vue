<template>
    <div class="card">
        <router-link :to="{ path: `/editions/${editionId}/imaged-objects/${imagedObject.id}` }">
            <img class="card-img-top" v-lazy="imageUrl" v-if="imageUrl" alt="ImagedObjectDetailed Image">
        </router-link>
        <label>{{artefactsNames}}</label>
    </div>
</template>

<script lang="ts">
import Vue from 'vue';
import { ImagedObjectSimple } from '@/models/imaged-object';

export default Vue.extend({
    props: {
        imagedObject: ImagedObjectSimple,
    },
    computed: {
        imageUrl(): string | undefined {
            if (this.imagedObject && this.imagedObject.recto && this.imagedObject.recto.masterIndex) {
                return this.imagedObject.recto.masterIndex.getThumbnailUrl(600);
            }
            return undefined;
        },
        editionId(): number {
            return this.$store.state.edition.editionId.id;
        },
        artefactsNames(): string {
            // TODO
            const names = this.imagedObject.artefacts.map((a) => a.name);
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
