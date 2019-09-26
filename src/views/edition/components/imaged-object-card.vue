<template>
    <div class="card">
        <router-link :to="{ path: `/editions/${editionId}/imaged-objects/${imagedObject.id}` }">
            <img class="card-img-top" v-lazy="imageUrl" v-if="imageUrl" alt="Imaged-Object">
        </router-link>
        <label>{{artefactsNames}}</label>
    </div>
</template>

<script lang="ts">
import Vue from 'vue';
import { ImagedObject } from '@/models/imaged-object';

export default Vue.extend({
    props: {
        imagedObject: Object as () => ImagedObject,
    },
    computed: {
        imageUrl(): string | undefined {
            if (this.imagedObject && this.imagedObject.recto && this.imagedObject.recto.master) {
                return this.imagedObject.recto.master.getThumbnailUrl(600);
            }
            return undefined;
        },
        editionId(): number | undefined {
            if (this.$state.editions.current) {
                return this.$state.editions.current.id;
            }
            return undefined;
        },
        artefactsNames(): string {
            const names = this.imagedObject.artefacts.map((a) => a.name);
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
