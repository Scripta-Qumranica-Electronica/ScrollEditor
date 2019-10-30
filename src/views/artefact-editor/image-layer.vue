<template>
    <g pointer-events="none">
        <!-- The coordinate system of this group is the artefact's master image.
             We download a partial image (only of the artefact's bounding box) and move
             it to the right position (with the x and y attributes of the image tag).
             The result is identical to downloading the full image. -->
        <defs>
            <path id="path" :d="clippingMask.svg"></path>
            <clipPath id="clip-path">
                <use stroke="none" fill="none" fill-rule="evenodd" xlink:href="#path"></use>
            </clipPath>
        </defs>
        <image
            v-for="imageSetting in visibleImageSettings"
            :key="'svg-image-' + imageSetting.image.url"
            clip-path="url(#clip-path)"
            draggable="false"
            :xlink:href="getImageUrl(imageSetting.image)"
            :width="boundingBox.width"
            :height="boundingBox.height"
            :x="boundingBox.x"
            :y="boundingBox.y"
            :opacity="imageSetting.opacity"
        />
        <!-- <use class="pulsate" v-if="clippingMask && !params.clipMask" stroke="blue" fill="none" fill-rule="evenodd" stroke-width="2" xlink:href="#Clip-path"></use>  -->
    </g>
</template>

<script lang="ts">
import Vue from 'vue';
import { wktPolygonToSvg } from '@/utils/VectorFactory';
import { ImageStack, IIIFImage } from '@/models/image';
import { Polygon } from '@/utils/Polygons';
import { SingleImageSetting } from '../../components/image-settings/types';
import { BaseEditorParams } from '@/models/editor-params';
import { BoundingBox } from '@/utils/helpers';

export default Vue.extend({
    name: 'image-layer',
    props: {
        width: Number,
        height: Number,
        params: Object as () => BaseEditorParams,
        editable: Boolean,
        clippingMask: Object as () => Polygon,
        boundingBox: Object as () => BoundingBox
    },
    data() {
        return {};
    },
    computed: {
        imageSettings(): SingleImageSetting[] {
            const values = Object.keys(this.params.imageSettings).map(
                (key) => this.params.imageSettings[key]
            );
            return values;
        },
        visibleImageSettings(): SingleImageSetting[] {
            return this.imageSettings.filter((image) => image.visible);
        }
    },
    methods: {
        getImageUrl(image: IIIFImage): string {
            const url = image.getScaledAndCroppedUrl(
                100 / this.$render.scalingFactors.image,
                this.boundingBox.x,
                this.boundingBox.y,
                this.boundingBox.width,
                this.boundingBox.height
            );
            return url;
        }
    }
});
</script>

<style lang="scss" scoped>
svg {
    max-height: initial;
}
</style>
