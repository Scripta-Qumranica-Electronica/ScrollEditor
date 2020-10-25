<template>
    <artefact-svg v-if="loaded"
                  :artefact="artefact"
                  :aspect-ratio="aspectRatio">
        <iiif-image 
            v-for="imageSetting in visibleImageSettings"
            :key="imageSetting.image.url"
            :image="imageSetting.image"
            :opacity="imageSetting.normalizedOpacity"
            :boundingBox="boundingBox"/>
    </artefact-svg>
</template>

<script lang="ts">
import { Component, Prop, Mixins } from 'vue-property-decorator';
import { ImageSetting, SingleImageSetting } from '@/components/image-settings/types';
import ArtefactDataMixin from './artefact-data-mixin';
import ArtefactSvg from './artefact-svg.vue';
import IIIFImageComponent from '../images/IIIFImage.vue';

@Component({
    name: 'artefact-image',
    components: {
        'artefact-svg': ArtefactSvg,
        'iiif-image': IIIFImageComponent,
    },
})
export default class ArtefactImage extends Mixins(ArtefactDataMixin) {
    @Prop({default: 1.3}) private aspectRatio!: number;
    @Prop({
        default: () => {
            return {} as ImageSetting;
        }
    }) private imageSettings!: ImageSetting;

    private loaded = false;

    get visibleImageSettings(): SingleImageSetting[] {
        if (!Object.keys(this.imageSettings).length) {
            // If no settings, just show the master image
            return [{
                image: this.imageStack!.master,
                type: 'master',
                visible: true,
                opacity: 1,
                normalizedOpacity: 1
            }];
        }

        const allImageSettings = Object.keys(this.imageSettings).map((key) => this.imageSettings[key]);
        const visibleImages = allImageSettings.filter((setting) => setting.visible);
        return visibleImages;
    }

    protected async mounted() {
        await this.mountedDone;
        this.loaded = true;
    }
}

</script>

<style lang="scss" scoped>
</style>
