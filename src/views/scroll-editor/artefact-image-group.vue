<template>
    <g v-if="loaded" :key="artefact.id" :transform="artefact.svgTransform">
        <defs>
            <path :id="`path-${artefact.id}`" v-if="scaledMask" :d="scaledMask.svg" />
            <clipPath :id="`clip-path-${artefact.id}`">
                <use stroke="none" fill="black" fill-rule="evenodd" :href="`#path-${artefact.id}`" />
            </clipPath>
        </defs>
        <g pointer-events="none" :clip-path="`url(#clip-path-${artefact.id})`">
            <image
                v-for="imageSetting in visibleImageSettings"
                :key="imageSetting.image.url"
                :xlink:href="getImageUrl(imageSetting)"
                :opacity="imageSetting.normalizedOpacity"
                :width="boundingBox.width"
                :height="boundingBox.height"
                :transform="`translate(${boundingBox.x} ${boundingBox.y})`"
            />
        </g>
    </g>
</template> 

<script lang="ts">
import { Component, Prop, Vue, Mixins } from 'vue-property-decorator';
import { Artefact } from '@/models/artefact';
import {
    ImageSetting,
    SingleImageSetting
} from '@/components/image-settings/types';
import ArtefactDataMixin from '@/components/artefact/artefact-data-mixin';

@Component({
    name: 'artefact-image-group'
})
export default class ArtefactImageGroup extends Mixins(ArtefactDataMixin) {
    private imageSettings: ImageSetting = {};

    private loaded = false;

    get visibleImageSettings(): SingleImageSetting[] {
        if (!Object.keys(this.imageSettings).length) {
            // If no settings, just show the master image
            return [
                {
                    image: this.imageStack!.master,
                    type: 'master',
                    visible: true,
                    opacity: 1,
                    normalizedOpacity: 1
                }
            ];
        }

        const allImageSettings = Object.keys(this.imageSettings).map(
            key => this.imageSettings[key]
        );
        const visibleImages = allImageSettings.filter(
            setting => setting.visible
        );
        return visibleImages;
    }
    protected async mounted() {
        await this.mountedDone;
        this.loaded = true;
    }

    private getImageUrl(imageSetting: SingleImageSetting) {
        return imageSetting.image.getFullUrl(1 * 100);
        // return imageSetting.url;
    }
}
</script>

<style lang="scss" scoped>
</style>                 