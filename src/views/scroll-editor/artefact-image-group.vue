<template>
    <g v-if="loaded" :key="artefact.id" :transform="groupTransform">
        <defs>
            <path :id="`path-${artefact.id}`" :d="artefact.mask.polygon.svg" />
            <clipPath :id="`clip-path-${artefact.id}`">
                <use stroke="none" fill="black" fill-rule="evenodd" :href="`#path-${artefact.id}`" />
            </clipPath>
        </defs>
        <g :clip-path="`url(#clip-path-${artefact.id})`">
            <image
                @click="onSelect()"
                :width="boundingBox.width"
                :height="boundingBox.height"
                :transform="imageTransform"
                :xlink:href="masterImageUrl"
            />
        </g>
        <path
            class="selected"
            v-if="selected"
            :d="artefact.mask.polygon.svg"
            vector-effect="non-scaling-stroke"
        />
    </g>
</template> 

<script lang="ts">
import { Component, Prop, Vue, Mixins, Emit } from 'vue-property-decorator';
import { Artefact } from '@/models/artefact';
import ArtefactDataMixin from '@/components/artefact/artefact-data-mixin';
import { Polygon } from '@/utils/Polygons';

@Component({
    name: 'artefact-image-group'
})
export default class ArtefactImageGroup extends Mixins(ArtefactDataMixin) {
    @Prop({
        default: false
    })
    public selected!: boolean;
    private loaded = false;
    // Add a selected property (default is false)
    // If artefact is selected, add a CSS style for the group, that will make the image brighter
    // Add a blinking bounary around the artefact - use the <path> element for this

    private imageScale = 0.5; // TODO: Set a dynamic scale, based on actual element size.
    // Wait until the IIIF server can handle requests of various sizes

    get masterImageUrl() {
        const image = this.imageStack!.master;
        const url = image.getScaledAndCroppedUrl(
            this.imageScale * 100,
            this.boundingBox.x,
            this.boundingBox.y,
            this.boundingBox.width,
            this.boundingBox.height
        );
        return url;
    }

    get imageTransform(): string {
        // Note that we do not zoom the image at all, even though its original resolution depends on imageScale
        // That's because we specify the width and height of the image element, and the browser makes sure the image
        // is scaled to those
        const translate = `translate(${this.boundingBox.x} ${this.boundingBox.y})`;
        return translate;
    }

    public get groupTransform(): string {
        const trans = this.artefact.mask.transformation;
        if (!trans.scale) {
            return '';
        }

        const scale = `scale(${trans.scale})`; // Scale by scale of transform

        // Rotate around the bounding box's center. When we apply this rotation, the artefact has already
        // been shifted to the bounding box starts at (0,0)
        const midX = this.boundingBox.width / 2;
        const midY = this.boundingBox.height / 2;
        const rotate = `rotate(${trans.rotate}, ${midX}, ${midY})`;

        // Move the image to the right place - first to (0,0) by reducing the bounding-box, then to the right position
        const translateX =
            -this.artefact.boundingBox.x +
            this.artefact.mask.transformation.translate.x;
        const translateY =
            -this.artefact.boundingBox.y +
            this.artefact.mask.transformation.translate.y;
        const translate = `translate(${translateX}, ${translateY})`;

        return `${scale} ${translate} ${rotate}`;
    }

    protected async mounted() {
        await this.mountedDone;
        this.loaded = true;
    }

    @Emit()
    private onSelect(): boolean {
        return true;
    }
}
</script>

<style lang="scss" scoped>
path.selected {
    stroke-width: 2;
    fill-opacity: 0.3;
    stroke: blue;
    fill: aliceblue;
}
</style>                 