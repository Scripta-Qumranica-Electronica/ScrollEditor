<template>
    <g v-if="image"
       :transform="groupTransform">
        <image :transform="imageTransform"
               :xlink:href="imageUrl"
               :opacity="opacity" />
    </g>
</template>

<script lang="ts">
import { Image } from '@/models/image';
import { BoundingBoxInterface } from '@/utils/helpers';
import { Component, Prop, Vue } from 'vue-property-decorator';

interface TileInfo {
    url: string;
    transform: string;
}

@Component({
    name: 'iiif-image',
})
export default class IIIFImageComponent extends Vue {
    @Prop() private image!: Image;
    @Prop() private boundingBox?: BoundingBoxInterface;  // In edition coordinates - the image in the edition's PPI
    @Prop({ default: 0.5 }) private scaleFactor!: number;
    @Prop() private maxWidth?: number;
    @Prop({ default: 1 }) private opacity!: number;


    // Image dimensions in edition coordinates
    private get editionCoordWidth(): number {
        return this.boundingBox?.width || this.image.width;
    }

    private get editionCoordHeight(): number {
        return this.boundingBox?.height || this.image.height;
    }

    // Image dimensions on the screen
    private get screenWidth(): number {
        if (this.maxWidth) {
            return this.maxWidth;
        }

        return this.editionCoordWidth * this.scaleFactor;
    }

    private get screenHeight(): number {
        return this.screenWidth * this.editionCoordHeight / this.editionCoordWidth;
    }

    private get serverScale(): number {
        let pct = this.screenWidth / this.editionCoordWidth;

        // Adjust to a maximum of 1000 pixels per image dimesion, until tiles are added
        const maxDim = Math.max(this.screenWidth, this.screenHeight);
        if (maxDim > 1000) {
            pct *= 1000 / maxDim;
        }

        return pct;
    }

    private get imageUrl(): string {
        if (this.boundingBox) {
            return this.image.getPlainScaledAndCroppedUrl(this.serverScale * 100,
                                                     this.boundingBox.x / this.image.ppiAdjustmentFactor,
                                                     this.boundingBox.y / this.image.ppiAdjustmentFactor,
                                                     this.boundingBox.width / this.image.ppiAdjustmentFactor,
                                                     this.boundingBox.height / this.image.ppiAdjustmentFactor);
        } else {
            return this.image.getPlainFullUrl(this.serverScale);
        }
    }

    private get groupTransform(): string {
        const scaleTransform = `scale(${1 / this.serverScale})`;
        let translateTransform = '';
        if (this.boundingBox) {
            translateTransform = `translate(${this.boundingBox.x}, ${this.boundingBox.y})`;
        }

        return translateTransform + ' ' + scaleTransform;
    }

    private get imageTransform(): string {
        return `scale(${this.image.ppiAdjustmentFactor})`;
    }
}
</script>

<style lang="scss" scoped>
</style>
