<template>
    <g pointer-events="none">
        <!-- The coordinate system of this group is the artefact's master image.
             We download a partial image (only of the artefact's bounding box) and move
             it to the right position (with the x and y attributes of the image tag).
        The result is identical to downloading the full image.-->
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
            :opacity="imageSetting.normalizedOpacity"
        />
        <!-- <use class="pulsate" v-if="clippingMask && !params.clipMask" stroke="blue" fill="none" fill-rule="evenodd" stroke-width="2" xlink:href="#Clip-path"></use>  -->
      
    </g>
  
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import { wktPolygonToSvg } from '@/utils/VectorFactory';
import { ImageStack, IIIFImage } from '@/models/image';
import { Polygon } from '@/utils/Polygons';
import { SingleImageSetting } from '../../components/image-settings/types';
import { BaseEditorParams } from '@/models/editor-params';
import { BoundingBox } from '@/utils/helpers';

@Component({
    name: 'image-layer'
})
export default class ImagedObjectEditor extends Vue {
    @Prop() public width!: number;
    @Prop() public height!: number;
    @Prop() public params!: BaseEditorParams;
    @Prop() public editable!: boolean;
    @Prop() public clippingMask!: Polygon;
    @Prop() public boundingBox!: BoundingBox;

    public get imageSettings(): SingleImageSetting[] {
        const values = Object.keys(this.params.imageSettings).map(
            key => this.params.imageSettings[key]
        );
        return values;
    }
    public get visibleImageSettings(): SingleImageSetting[] {
        console.log(this.imageSettings, 'this.imageSettings CHANGE');
        return this.imageSettings.filter(image => image.visible);
    }

    public getImageUrl(image: IIIFImage): string {
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
</script>


<style lang="scss" scoped>
svg {
    max-height: initial;
}
</style>
