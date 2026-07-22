<template>
    <artefact-svg v-if="loaded"
                  :artefact="artefact"
                  :imaged-object="imagedObject"
                  :aspect-ratio="aspectRatio">
        <g v-if="!artefact.isVirtual">
            <iiif-image
                v-for="imageSetting in visibleImageSettings"
                :key="imageSetting.image.url"
                :image="imageSetting.image"
                :opacity="imageSetting.normalizedOpacity"
                :boundingBox="boundingBox"
                :maxWidth="maxWidth"
                :dynamic="false"/>
        </g>
        <path v-if="artefact.isVirtual"
                class="virtual-path"
                :d="artefact.mask.svg"
                vector-effect="non-scaling-stroke"
        />
    </artefact-svg>
</template>

<script lang="ts">
import { Component, Prop, mixins, toNative } from 'vue-facing-decorator';
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
class ArtefactImage extends mixins(ArtefactDataMixin) {
    @Prop({default: 1.3}) public aspectRatio!: number;
    @Prop({
        default: () => {
            return {} as ImageSetting;
        }
    }) private imageSettings!: ImageSetting;
    @Prop({ default: 400 })
    public maxWidth!: number;

    public loaded = false;

    get visibleImageSettings(): SingleImageSetting[] {
        if (this.artefact.isVirtual) {
            return [];
        }

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

    public async mounted() {
        await this.mountedDone;
        this.loaded = true;
    }
}

export default toNative(ArtefactImage);
</script>

<style lang="scss" scoped>
@import '@/assets/styles/_variables.scss';

.virtual-path {
    stroke-width: 2;
    fill-opacity: 0.3;
    stroke: $virtual-artefact-outline-color;
}
</style>
