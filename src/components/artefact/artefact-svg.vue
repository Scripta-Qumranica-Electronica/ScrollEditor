<template>
    <div>
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
                <slot v-bind:getImageUrl="getImageUrl"></slot>
            </g>
        </svg>
    </div>
</template>

<script lang="ts">
import { Component, Prop, Vue, Mixins } from 'vue-property-decorator';
import { Artefact } from '@/models/artefact';
import { ImageStack, IIIFImage } from '@/models/image';
import { Polygon } from '@/utils/Polygons';
import { BoundingBox } from '@/utils/helpers';
import { ImageSetting, SingleImageSetting } from '@/components/image-settings/types';
import ArtefactDataMixin from './artefact-data-mixin';

@Component({
    name: 'artefact-svg',
})
export default class ArtefactSvg extends  Mixins(ArtefactDataMixin) {
    @Prop({default: 1.3}) private aspectRatio!: number;

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

    protected async mounted() {
        await this.mountedDone;
        this.loaded = true;
        this.updateWidth();
        window.addEventListener('resize', () => {
            this.updateWidth();
        });
    }

    protected getImageUrl(image: IIIFImage) {
        const url = image.getScaledAndCroppedUrl(this.serverScale,
            this.boundingBox.x,
            this.boundingBox.y,
            this.boundingBox.width,
            this.boundingBox.height);
        return url;
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
}

</script>

<style lang="scss" scoped>
</style>
