<template>
<div>
    <div id="svg-scale" :style="{transform: `scale(${secondaryScale})`}">
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
                        draggable="false"
                        :href="masterImageUrl"></image>
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
import { ImagedObject } from '@/models/imaged-object';
import { ImageSetting } from '@/views/imaged-object-editor/types';
import { IIIFImage, ImageStack } from '@/models/image';
import ImageService from '@/services/image';
import { Polygon } from '@/utils/Polygons';

export default Vue.extend({
    props: {
        artefact: Artefact,
        scale: Number,
    },
    data() {
        return {
            artefactService: new ArtefactService(),
            imageService: new ImageService(),
            imageStack: undefined as ImageStack | undefined,
            masterImageManifest: undefined as any,
            divWidth: 1 as any,  // Needs to be set in mount(), since this.$el is not reactive
            scaledMask: {} as Polygon,
        };
    },
    computed: {
        scaledImageWidth(): number {
            if (this.masterImageManifest) {
                return this.masterImageManifest.width * this.scale;
            }

            return 200;
        },

        scaledImageHeight(): number {
            if (this.masterImageManifest) {
                return this.masterImageManifest.height * this.scale;
            }

            return 150;
        },

        secondaryScale(): number {
            const scale = this.divWidth / this.scaledImageWidth;
            return scale;
        },

        masterImageUrl(): string | undefined {
            if (!this.imageStack) {
                return undefined;
            }

            return this.imageStack.master.getFullUrl(this.scale * 100);
        }
    },
    async mounted() {
        this.divWidth = this.$el.clientWidth;

        const imagedObject = await this.artefactService.getArtefactImagedObject(
            this.artefact.editionId!, this.artefact.imagedObjectId);
        this.imageStack = this.artefact.side === 'recto' ? imagedObject.recto : imagedObject.verso;
        if (!this.imageStack) {
            throw new Error(`ImagedObject ${this.artefact.imagedObjectId} doesn't contain the ` +
                            `${this.artefact.side} side even though artefact ${this.artefact.id} references it`);
        }
        await this.imageService.fetchImageManifest(this.imageStack.master);

        this.scaledMask = Polygon.scale(this.artefact.mask.polygon, this.scale);
        this.masterImageManifest = this.imageStack.master.manifest;

        window.addEventListener('resize', () => {
            this.divWidth = this.$el.clientWidth;
        });
    },
});
</script>

<style lang="scss" scoped>
#svg-scale {
    transform-origin: 0 0;
}
</style>
