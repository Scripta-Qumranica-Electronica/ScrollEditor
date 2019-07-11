<template>
    <div class="card">
        <label>{{artefact.name}}</label>
        <img v-lazy="image" v-if="image" alt="Artefact">
        <pre>{{artefact.mask}}</pre>
    </div>
</template>

<script lang="ts">
import Vue from 'vue';
// import AsyncComputed from 'vue-async-computed';

import { Artefact } from '../../models/artefact';
import ArtefactService from '../../services/artefact';
import { ImagedObject } from '../../models/imaged-object';

export default Vue.extend({
    props: {
        artefact: Artefact,
    },
    data() {
        return {
            artefactService: new ArtefactService(),
            image: undefined,
        };
    },
    // asyncComputed: {
    //     async imageUrl(): Promise<any> {
    //         const result = await this.artefactService.getArtefactImagedObject
    //                        (this.editionId!, this.artefact.imagedObjectId)
    //         .then((data: ImagedObject) => {
    //             if (data.recto && data.recto.master) {
    //                 return data!.recto!.master.getThumbnailUrl(150);
    //             }
    //             return undefined;
    //         });
    //         return result;
    //     }
    // },
    computed: {
        // async imageUrl(): Promise<any> {
        //     const result = await this.artefactService.getArtefactImagedObject
        //                    (this.editionId!, this.artefact.imagedObjectId)
        //     .then((data: ImagedObject) => {
        //         if (data.recto && data.recto.master) {
        //             return data!.recto!.master.getThumbnailUrl(150);
        //         }
        //         return undefined;
        //     });
        //     return result;
        // },
        editionId(): number | undefined {
            if (this.$state.editions.current) {
                return this.$state.editions.current.id;
            }
            return undefined;
        }
    },
    async mounted() {
        if (this.editionId) {
            this.image = await this.getImageUrl();
        }
    },
    methods: {
        async getImageUrl(): Promise<any> {
            const result = await this.artefactService.getArtefactImagedObject
            (this.editionId!, this.artefact.imagedObjectId)
            .then((data: ImagedObject) => {
                if (data.recto && data.recto.master) {
                    return data!.recto!.master.getThumbnailUrl(150);
                }
                return undefined;
            });
            return result;
        }
    }
});
</script>

<style lang="scss" scoped>
div.card {
    margin-bottom: 20px;

    img {
        cursor: pointer;
        display: block;
        height: 200px;
        width: 200px;
        object-fit: cover;
    }
}
</style>
