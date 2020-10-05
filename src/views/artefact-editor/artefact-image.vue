<template>
<div>
    <div id="svg-scale">
        <svg :viewbox="`0 0 ${scaledImageWidth} ${scaledImageHeight}`"
            :width="scaledImageWidth"
            :height="scaledImageHeight">

            <g>
                <defs>
                    <path :id="`path-${artefact.id}`" v-if="scaledMask" :d="scaledMask.svg"></path>
                    <clipPath :id="`clip-path-${artefact.id}`">
                        <use stroke="none" fill="black" fill-rule="evenodd" :href="`#path-${artefact.id}`"></use>
                    </clipPath>
                </defs>
                <g pointer-events="none" :clip-path="`url(#clip-path-${artefact.id}`">
                    <image 
                        v-for="imageSetting in visibleImageSettings"
                        :key="imageSetting.image.url"
                        draggable="false"
                        :xlink:href="getImageUrl(imageSetting)"
                        :opacity="imageSetting.normalizedOpacity"></image>
                </g>
            </g>
        </svg>
    </div>
</div>
</template>

<script lang="ts">
/*
 * This component shows an image of an artefact, clipped by the artefact's mask.
 *
 * It has several coordinate systems that all need to work together.
 *
 * We display the Artefact's ImagedObject master image. This image has its width and height
 * (which are received from the server). We don't load the full image size, instead our component
 * has a scale property. We ask the IIIF server for a scaled down version of the image.
 *
 * We want the image to fit inside our <div>. The div's dimensions are decided by its parent.
 * We use a CSS scale transform to further scale the image so that it fits inside the div.
 *
 * Here are the various sizes we have:
 *
 * masterImageManifest.width, masterImageManifest.height : dimensions of the full resolution image on the server
 * masterImage.width, masterImage.height: dimension of full resolution image in edition coordinates
 * scaledImageWidth, scaledImageHeight: dimension of the <svg> image (original image scaled down by the scale property)
 * divWidth: width of the HTML element we can fill
 * secondaryScale: Second scale factor so the image fits in the HTML element.
 *
 * artefact.mask: The artefact's mask in the original image's coordinates
 * scaledMask: The artefact's mask scaled down by the scale factor, used to clip the SVG image
 *
 * TODO: Support blending all images, instead of just the master image
 */

import Vue from 'vue';
// import AsyncComputed from 'vue-async-computed';

import { Artefact } from '@/models/artefact';
import ArtefactService from '@/services/artefact';
import { Image, ImageStack } from '@/models/image';
import { Polygon } from '@/utils/Polygons';
import { SingleImageSetting, ImageSetting } from '@/components/image-settings/types';
import ImagedObjectService from '@/services/imaged-object';

export default Vue.extend({
    props: {
        artefact: Object as () => Artefact,
        scale: Number,
        imageSettingsParams: {
            type: Object as () => ImageSetting,
        },
    },
    data() {
        return {
            artefactService: new ArtefactService(),
            imagedObjectService: new ImagedObjectService(),
            imageStack: undefined as ImageStack | undefined,
            masterImage: undefined as Image | undefined,
            scaledMask: {} as Polygon,
        };
    },
    computed: {
        scaledImageWidth(): number {
            if (this.masterImage) {
                return this.masterImage.width * this.scale;
            }

            return 200;
        },

        scaledImageHeight(): number {
            if (this.masterImage) {
                return this.masterImage.height * this.scale;
            }

            return 150;
        },

        imageSettings(): SingleImageSetting[] {
            if (!this.imageSettingsParams) {
                return [];
            }
            const values = Object.keys(this.imageSettingsParams).map((key) => this.imageSettingsParams[key]);
            return values;
        },

        visibleImageSettings(): SingleImageSetting[] {
            return this.imageSettings.filter((image) => image.visible);
        }
    },
    async mounted() {
        await this.$state.prepare.edition(this.artefact.editionId);
        const imagedObject = this.$state.imagedObjects.find(this.artefact.imagedObjectId);
        if (!imagedObject) {
            throw new Error(`Can't find ImagedObject ${this.artefact.imagedObjectId} for artefact ${this.artefact.id}`);
        }
        this.imageStack = this.artefact.side === 'recto' ? imagedObject.recto : imagedObject.verso;
        if (!this.imageStack) {
            throw new Error(`ImagedObject ${this.artefact.imagedObjectId} doesn't contain the ` +
                            `${this.artefact.side} side even though artefact ${this.artefact.id} references it`);
        }
        await this.$state.prepare.imageManifest(this.imageStack.master);

        this.scaledMask = Polygon.scale(this.artefact.mask, this.scale);
        this.masterImage = this.imageStack.master;
    },
    methods: {
        getImageUrl(imageSetting: SingleImageSetting) {
            return imageSetting.image.getFullUrl(this.scale * 100);
        }
    }
});
</script>

<style lang="scss" scoped>
#svg-scale {
    transform-origin: 0 0;
}
</style>
