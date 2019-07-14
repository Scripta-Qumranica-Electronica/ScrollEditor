<template>
    <div class="card">
        <label>{{artefact.name}}</label>
        <img v-lazy="image" v-if="image" alt="Artefact">
    
        <svg    :width="actualWidth"
                :height="actualHeight"
                :viewbox="'0 0 ' + actualWidth + ' ' + actualHeight">
        <g>
        <defs>
            <path id="Full-clip-path" :d="fullImageMask"></path>
           <clipPath id="Full-clipping-outline">
            <use stroke="none" fill="black" fill-rule="evenodd" xlink:href="#Full-clip-path"></use>
            </clipPath>
            <path id="Clip-path" v-if="artefact.mask.polygon" :d="this.artefact.mask.polygon.svg" :transform="pathTransform"></path>
            <clipPath id="Clipping-outline">
            <use stroke="none" fill="black" fill-rule="evenodd" xlink:href="#Clip-path"></use>
            </clipPath>
        </defs>
        <g pointer-events="none" clip-path='url(#Full-clipping-outline)'>
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
        fullImageMask(): string {
            return `M0 0L${this.actualWidth} 0L${this.actualWidth} ${this.actualHeight}L0 ${this.actualHeight}`;
        },
        pathTransform(): string {
            const transform = 'scale(0.5)'; // `scale(${this.scale / this.$render.scalingFactors.image})`;
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
                    return data!.recto!.master.getThumbnailUrl(150);
                }
                return undefined;
            });
            return result;
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
            },
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
