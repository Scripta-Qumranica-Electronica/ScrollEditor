<template>
    <g v-if="loaded" :key="artefact.id" :transform="groupTransform">
        <defs>
            <path :id="`path-${artefact.id}`" :d="artefact.mask.polygon.svg" />
            <clipPath :id="`clip-path-${artefact.id}`">
                <use stroke="none" fill="black" fill-rule="evenodd" :href="`#path-${artefact.id}`" />
            </clipPath>
        </defs>
        <g pointer-events="none" :clip-path="`url(#clip-path-${artefact.id})`">
            <image 
                :width="boundingBox.width"
                :height="boundingBox.height"
                :transform="imageTransform"
                :xlink:href="masterImageUrl"
            />
        </g>
    </g>
</template> 

<script lang="ts">
import { Component, Prop, Vue, Mixins } from 'vue-property-decorator';
import { Artefact } from '@/models/artefact';
import ArtefactDataMixin from '@/components/artefact/artefact-data-mixin';
import { Polygon } from '@/utils/Polygons';

@Component({
    name: 'artefact-image-group'
})
export default class ArtefactImageGroup extends Mixins(ArtefactDataMixin) {
    private loaded = false;

    private imageScale = 0.5; // TODO: Set a dynamic scale, based on actual element size.
                              // Wait until the IIIF server can handle requests of various sizes

    get masterImageUrl() {
        return this.imageStack!.master.getFullUrl(this.imageScale * 100);
    }

    get imageTransform(): string {
        // The image is loaded at a lower resolution (depending on scale),
        // we need to scale it back to the original size of the image
        const scale = `scale(1 / ${this.imageScale})`;

        // And we need to move it so that the artefact image is shown
        const translate = `translate(${this.boundingBox.x} ${this.boundingBox.y})`;

        return `${translate} ${scale}`;
    }

    public get groupTransform(): string {
        const trans = this.artefact.mask.transformation;
        if (!trans.scale) {
            return '';
        }

        const scale = `scale(${trans.scale})`;   // Scale by scale of transform
        const translate = `translate(${trans.translate.x} ${trans.translate.y})`;

        // Rotate around the bounding box's center. When we apply this rotation, the artefact has already
        // been shifted to the bounding box starts at (0,0)
        const midX = this.boundingBox.width / 2;
        const midY = this.boundingBox.height / 2;
        const rotate = `rotate(${trans.rotate}, ${midX}, ${midY})`;

        return `${scale} ${translate} ${rotate}`;
    }

    protected async mounted() {
        await this.mountedDone;
        this.loaded = true;
    }
}
</script>

<style lang="scss" scoped>
</style>                 