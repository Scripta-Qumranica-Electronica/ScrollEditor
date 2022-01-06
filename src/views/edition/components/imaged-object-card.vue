<template>
    <div class="card">
        <router-link :to="{ path: `/editions/${editionId}/imaged-objects/${imageObjectId}` }">
            <img class="card-img-top" v-lazy="imageUrl" v-if="imageUrl" alt="Imaged-Object">
        </router-link>
        <label>{{imagedObject.name}}</label>
    </div>
</template>

<script lang="ts">
import { Component, Prop, Emit, Vue } from 'vue-property-decorator';

import { ImagedObject } from '@/models/imaged-object';

@Component({
    name: 'imaged-object-card',
})

export default class ImagedObjectCard extends Vue {

     @Prop() private imagedObject!: ImagedObject;

    private get imageUrl(): string | undefined {
        // TS 3.7 and up , optional chaining returns undefined
        // if any chain member is null or undefined
         return this.imagedObject?.recto?.master?.getThumbnailUrl(600);
    }

    private get imageObjectId(): string  {
        // encodes characters such as ?,=,/,&,:
         return encodeURIComponent( this.imagedObject?.id) ;
    }

    private get editionId(): number | undefined {
        return this.$state?.editions?.current?.id;
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
