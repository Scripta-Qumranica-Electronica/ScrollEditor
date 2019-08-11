<template>
<div>
    <div id="svg-scale" :style="{transform: `scale(${secondaryScale})`}">
        <svg :viewbox="`0 0 ${imageWidth} ${imageHeight}`"
            :width="imageWidth"
            :height="imageHeight">

            <g>
                <defs>
                    <!-- <path id="clip-path" v-if="artefact.mask.polygon" :d="artefact.mask.polygon.svg" :transform="pathTransform"></path>
                    <clipPath id="clipping-outline">
                        <use stroke="none" fill="black" fill-rule="evenodd" xlink:href="#clip-path"></use>
                    </clipPath> -->
                </defs>
                <g pointer-events="none"> <!-- clip-path="url(#clipping-outline)"> -->
                    <image 
                        class="clippedImg" 
                        draggable="false"
                        :xlink:href="masterImageUrl"></image>
                </g>
            </g>
        </svg>
    </div>
</div>
</template>

<script lang="ts">
import Vue from 'vue';
// import AsyncComputed from 'vue-async-computed';

import { Artefact } from '../../models/artefact';
import ArtefactService from '../../services/artefact';
import { ImagedObject } from '../../models/imaged-object';
import { ImageSetting } from '../imaged-object-editor/types';
import { IIIFImage, ImageStack } from '@/models/image';
import ImageService from '@/services/image';

export default Vue.extend({
    props: {
        artefact: Artefact,
        scale: Number,
    },
    data() {
        return {
            artefactService: new ArtefactService(),
            imageService: new ImageService(),
            imagedObject: undefined as ImagedObject | undefined,
            imageStack: undefined as ImageStack | undefined,
            masterImageManifest: undefined as any,
            elementWidth: 1 as any,
        };
    },
    computed: {
        imageWidth(): number {
            if (this.masterImageManifest) {
                return this.masterImageManifest.width * this.scale;
            }

            return 200;
        },

        imageHeight(): number {
            if (this.masterImageManifest) {
                return this.masterImageManifest.height * this.scale;
            }

            return 150;
        },

        secondaryScale(): number {
            const scale = this.elementWidth / this.imageWidth;
            console.log(`Calculating secondary scale based on ${this.elementWidth} and ${this.imageWidth}: ${scale}`);
            return scale;
        },

        masterImageUrl(): string | undefined {
            if (!this.imageStack) {
                return undefined;
            }
            console.log('this.imageStack: ', this.imageStack, ' master: ', this.imageStack.master);

            return this.imageStack.master.getFullUrl(this.scale * 100);
        }
    },
    async mounted() {
        this.elementWidth = this.$el.clientWidth;

        this.imagedObject = await this.artefactService.getArtefactImagedObject(this.artefact.editionId!, this.artefact.imagedObjectId);
        this.imageStack = this.artefact.side === 'recto' ? this.imagedObject.recto : this.imagedObject.verso;
        if(!this.imageStack) {
            throw new Error(`ImagedObject ${this.artefact.imagedObjectId} doesn't contain the ${this.artefact.side} side even though artefact ${this.artefact.id} references it`);  
        }
        await this.imageService.fetchImageManifest(this.imageStack.master);
        this.masterImageManifest = this.imageStack.master.manifest;
        console.log('Updated manifest to ', this.imageStack.master.manifest);
    },
});
</script>

<style lang="scss" scoped>
#svg-scale {
    transform-origin: 0 0;
}
</style>
