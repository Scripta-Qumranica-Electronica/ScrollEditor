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
import { Component, Prop, Vue, Mixins } from 'vue-property-decorator';
import { Artefact } from '@/models/artefact';
import { ImageStack, IIIFImage } from '@/models/image';
import ArtefactService from '@/services/artefact';
import ImageService from '@/services/image';
import { Polygon } from '@/utils/Polygons';
import { BoundingBox } from '@/utils/helpers';
import { ImageSetting, SingleImageSetting } from '@/components/image-settings/types';
import ArtefactDataMixin from './artefact-data-mixin';

@Component({
    name: 'simple-artefact-image',
})
export default class SimpleArtefactImage extends  Mixins(ArtefactDataMixin) {
    @Prop({default: 1.3}) private aspectRatio!: number;
    @Prop({
        default: () => {
            return {} as ImageSetting;
        }
    }) private imageSettings!: ImageSetting;

    private elementWidth = 0;
    private serverScale = 5;
    private loaded = false;

    get scale(): number {
        if (this.elementWidth && this.masterImageManifest) {
            return this.elementWidth / this.boundingBox.width;
        }

        return 0.05;
    }

    get elementHeight(): number {
        if (this.elementWidth) {
            return this.elementWidth / this.aspectRatio;
        }

        return 100;
    }

    get visibleImageSettings(): SingleImageSetting[] {
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

    protected async mounted() {
        await this.mountedDone;
        this.loaded = true;
        this.updateWidth();
        window.addEventListener('resize', () => {
            this.updateWidth();
        });
    }

    private updateWidth() {
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
    }

    private getImageUrl(image: IIIFImage) {
        const url = image.getScaledAndCroppedUrl(this.serverScale,
            this.boundingBox.x,
            this.boundingBox.y,
            this.boundingBox.width,
            this.boundingBox.height);
        return url;
    }
}

</script>

<style lang="scss" scoped>
</style>
