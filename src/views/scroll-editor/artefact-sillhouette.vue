<template>
    <g
        :transform="transformer.artefactTransform"
        :data="artefact.zOrder"
        style="background-color:green"
    >
        <defs>
            <path :id="`path-${artefact.id}`" :d="artefact.mask.svg" />
            <clipPath :id="`clip-path-${artefact.id}`">
                <use fill="black" stroke="none"  fill-rule="evenodd" :href="`#path-${artefact.id}`"
                style="background-color:green"

                 />
            </clipPath>
        </defs>
        <!-- Tsvia: Add a CSS class if the artefact is inViewport, and change its background to pink -->
        <path
            class="sillhouette"
            :d="artefact.mask.svg"
            vector-effect="non-scaling-stroke"
            :style="inViewport ? 'fill:pink;fill-opacity:1;': 'fill:blue;fill-opacity:0'"
        />
          <!-- style="fill:pink;fill-opacity:1;" -->
           <!-- :class="[ inViewport ? 'pink-bg': 'pink-bg']" -->
    </g>
</template>

<!--SVG transformation guide:

We perform the following transformations.

First, use imageTransform to return the image to its original coordinates. We ask for a cropped image from the IIIF server - exactly the artefact's bounding box.
imageTransform moves it back to the original image coordinates.

Then, the polygon is applied, and we get just the clipped artefact image. The polygon is in the original image's coordinate system.

Then we move the bounding box's center to (0, 0), so we can perform scaling and rotating around the center (the svg scale transform does not have a center argument).
We scale and rotate.
Finally we translate the image to its place.
-->

<script lang="ts">
import { Component, Prop, Vue, } from 'vue-property-decorator';
import { Artefact } from '@/models/artefact';
import { ArtefactTransformer } from '@/utils/artefact-transformer';

@Component({
    name: 'artefact-sillhouette'
})
export default class ArtefactSillouhette extends Vue {
    @Prop()
    public artefact!: Artefact;

    private transformer: ArtefactTransformer | null = null;

    public created() {
        this.transformer = new ArtefactTransformer(this.artefact);
    }

   private get inViewport(): boolean {
        return this.artefact.inViewport ;

   }
}
</script>

<style lang="scss">
path {
    stroke: black;
    stroke-width: 1px;
    fill: darkgray;
}

</style>
