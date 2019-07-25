<template>
<div class="card">
    <label>{{artefact.name}}</label>
    <pre>{{this.artefact.mask.polygon}}</pre>

    <svg    :width="actualWidth"
            :height="actualHeight"
            :viewbox="'0 0 ' + actualWidth + ' ' + actualHeight">
    <g>
    <defs>
        <path id="clip-path" v-if="artefact.mask.polygon" :d="artefact.mask.polygon.svg" :transform="pathTransform"></path>
        <clipPath id="clipping-outline">
            <use stroke="none" fill="black" fill-rule="evenodd" xlink:href="#clip-path"></use>
        </clipPath>
    </defs>
    <g pointer-events="none" clip-path="url(#clipping-outline)">
        <image v-for="imageSetting in imageSettings" 
            :key="'svg-image-' + imageSetting.image.url"
            class="clippedImg" 
            draggable="false"
            :xlink:href="imageSetting.image.getFullUrl(100 / $render.scalingFactors.image)"
            :width="actualWidth"
            :height="actualHeight"
            :opacity="imageSetting.opacity"
            :visibility="imageSetting.visible ? 'visible' : 'hidden'"></image>
    </g>
    <use class="pulsate" v-if="artefact.mask.polygon" stroke="blue" fill="none" fill-rule="evenodd" stroke-width="2" xlink:href="#Clip-path"></use> 
    </g>
</svg>
</div>
</template>

<script lang="ts">
import Vue from 'vue';
// import AsyncComputed from 'vue-async-computed';

import { Artefact } from '../../models/artefact';
import ArtefactService from '../../services/artefact';
import { ImagedObject } from '../../models/imaged-object';
import { ImageSetting } from '../imaged-object-editor/types';

export default Vue.extend({
props: {
    artefact: Artefact,
},
data() {
    return {
        artefactService: new ArtefactService(),
        image: undefined,
        imagedObject: {} as ImagedObject | undefined,
        imageSettings: {} as ImageSetting,
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
    },
    actualWidth(): number {
        // if (!this.imagedObject) {
        //     return 0;
        // }
        // return this.imagedObject!.recto!.master.masterImage!.manifest.width / this.$render.scalingFactors.image;
        return 200; // 3608;
    },
    actualHeight(): number {
        // return this.imagedObject!.recto.master.masterImage!.manifest.height / this.$render.scalingFactors.image;
        return 200; // 2706;
    },
    pathTransform(): string {
        const transform = 'scale(0.05)'; // `scale(${this.scale / this.$render.scalingFactors.image})`;
        return transform;
    },
},
async mounted() {
    if (this.editionId) {
        this.image = await this.getImageUrl();
    }
    this.fillImageSettings();
},
methods: {
    async getImageUrl(): Promise<any> {
        const result = await this.artefactService.getArtefactImagedObject
        (this.editionId!, this.artefact.imagedObjectId)
        .then((data: ImagedObject) => {
            this.imagedObject = data;
            if (data.recto && data.recto.master) {
                return data!.recto!.master.getFullUrl(10);
            }
            return undefined;
        });
        // return result;
    },
    fillImageSettings() {
        this.imageSettings = {};
        if (this.imagedObject) {
            if (this.imagedObject.recto && this.imagedObject.recto) {
                for (const imageType of this.imagedObject.recto.availableImageTypes) {
                    const image = this.imagedObject.recto.getImage(imageType);
                    if (image) {
                    const master =
                        this.imagedObject.recto.master.type === imageType;
                    const imageSetting = {
                        image,
                        type: imageType,
                        visible: master,
                        opacity: 1
                    };
                    this.$set(this.imageSettings, imageType, imageSetting); // Make sure this object is tracked by Vue
                    }
                }
            }
        }
        console.log('imageSettings=', this.imageSettings);
    },
}
});
</script>

<style lang="scss" scoped>
div.card {
margin-bottom: 20px;
}
</style>
