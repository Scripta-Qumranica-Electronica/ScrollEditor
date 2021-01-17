<template>
    <div class="card">
        <router-link :to="{ path: `/editions/${editionId}/imaged-objects/${imagedObject.id}` }">
            <img class="card-img-top" v-lazy="imageUrl" v-if="imageUrl" alt="Imaged-Object">
        </router-link>
        <label>{{artefactsNames}}</label>
    </div>
</template>

<script lang="ts">
import { Component, Prop, Emit, Vue } from 'vue-property-decorator';

import { ImagedObject } from '@/models/imaged-object';

@Component({
    name: 'imaged-object-card',
})

export default class ImagedObjectCard extends Vue {

    // props

    @Prop() protected imagedObject!: ImagedObject;
                                 // Object as () => ImagedObject,

    // computed:

    public get imageUrl(): string | undefined {
        if (this.imagedObject && this.imagedObject.recto && this.imagedObject.recto.master) {
            return this.imagedObject.recto.master.getThumbnailUrl(600);
        }
        return undefined;
    }

    public get editionId(): number | undefined {
        if (this.$state.editions.current) {
            return this.$state.editions.current.id;
        }
        return undefined;
    }

    public get artefactsNames(): string {
        const names = this.imagedObject.artefacts.map((a) => a.name);
         // Taken from here: https://stackoverflow.com/a/42123984/871910
        const unique = [...new Set(names)];
        return unique.join(', ');
    }

}

</script>

<style lang="scss" scoped>
div.card {
    margin-bottom: 20px;

    img {
        cursor: pointer;
    }
}
</style>
