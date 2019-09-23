<template>
    <div v-show="loaded">
        <svg v-if="loaded"
            :viewBox="`${boundingBox.x} ${boundingBox.y} ${boundingBox.width} ${boundingBox.height}`"
            :width="elementWidth"
            :height="elementHeight" 
            xmlns="http://www.w3.org/2000/svg"
            xmlns:xlink="http://www.w3.org/1999/xlink">
            <defs>
                <path
                    :id="`path-${artefact.id}`"
                    :d="artefact.mask.polygon.svg"/>
                <clipPath :id="`clip-path-${artefact.id}`">
                    <use stroke="none" fill="none" fill-rule="evenodd" :xlink:href="`#path-${artefact.id}`"></use>
                </clipPath>
            </defs>

            <g :clip-path="`url(#clip-path-${artefact.id}`">
                <image 
                    v-for="imageSetting in visibleImageSettings"
                    :key="imageSetting.image.url"
                    :xlink:href="getImageUrl(imageSetting.image)"
                    :opacity="imageSetting.opacity"
                    :width="boundingBox.width"
                    :height="boundingBox.height"
                    :transform="`translate(${boundingBox.x} ${boundingBox.y})`"/>
                    />
            </g>
        </svg>
    </div>
</template>

<script lang="ts">
import Vue from 'vue';
import { Artefact } from '@/models/artefact';
import { ImageStack, IIIFImage } from '@/models/image';
import ArtefactService from '@/services/artefact';
import ImageService from '@/services/image';
import { Polygon } from '@/utils/Polygons';
import { BoundingBox } from '@/utils/helpers';
import { ImageSetting, SingleImageSetting } from '@/components/image-settings/types';

export default Vue.extend({
    name: 'simple-artefact-image',
    props: {
        artefact: Object as () => Artefact,
        aspectRatio: {
            default: 1.3,  // width/height
            type: Number,
        },
        imageSettings: {
            type: Object as () => ImageSetting,
            default: () => {
                return {} as ImageSetting;
            },
        },
    },
    data() {
        return {
            artefactService: new ArtefactService(),
            imageService: new ImageService(),
            imageStack: undefined as ImageStack | undefined,
            masterImageManifest: undefined as any,
            boundingBox: new BoundingBox(),
            loaded: false,
            elementWidth: 0,
            serverScale: 5,
        };
    },
    computed: {
        scale(): number {
            if (this.elementWidth && this.masterImageManifest) {
                return this.elementWidth / this.boundingBox.width;
            }

            return 0.05;
        },
        elementHeight(): number {
            if (this.elementWidth) {
                return this.elementWidth / this.aspectRatio;
            }

            return 100;
        },
        visibleImageSettings(): SingleImageSetting[] {
            if (!Object.keys(this.imageSettings).length) {
                // If no settings, just show the master image
                return [{
                    image: this.imageStack!.master,
                    type: 'master',
                    visible: true,
                    opacity: 1,
                }];
            }

            const allImageSettings = Object.keys(this.imageSettings).map((key) => this.imageSettings[key]);
            const visibleImages = allImageSettings.filter((setting) => setting.visible);
            return visibleImages;
        }
    },
    async mounted() {
        // We're using mounted instead of created, because we want this.$el to be set, *and* the manifest to load
        // before calling updateWidth.
        const imagedObject = await this.artefactService.getArtefactImagedObject(
            this.artefact.editionId!, this.artefact.imagedObjectId);
        this.imageStack = this.artefact.side === 'recto' ? imagedObject.recto : imagedObject.verso;
        if (!this.imageStack) {
            throw new Error(`ImagedObject ${this.artefact.imagedObjectId} doesn't contain the ` +
                            `${this.artefact.side} side even though artefact ${this.artefact.id} references it`);
        }
        await this.imageService.fetchImageManifest(this.imageStack.master);
        this.masterImageManifest = this.imageStack.master.manifest;
        this.boundingBox = this.artefact.mask.polygon.getBoundingBox();

        this.loaded = true;

        this.updateWidth();
        window.addEventListener('resize', () => {
            this.updateWidth();
        });
    },
    methods: {
        updateWidth() {
            this.elementWidth = this.$el.clientWidth;
            if (!this.loaded) {
                // This should never happen
                console.warn('updateWidth called before data was loaded, which makes very little sense');
                this.serverScale = 5;
                return;
            }

            this.serverScale = this.imageStack!.master.getOptimizedScaleFactor(this.elementWidth,
                this.elementWidth / this.aspectRatio,
                this.boundingBox);
        },
        getImageUrl(image: IIIFImage) {
            const url = image.getScaledAndCroppedUrl(this.serverScale,
                this.boundingBox.x,
                this.boundingBox.y,
                this.boundingBox.width,
                this.boundingBox.height);

            console.log(`Returning ${url}`);
            return url;
        },
    },
});
</script>

<style lang="scss" scoped>
</style>
