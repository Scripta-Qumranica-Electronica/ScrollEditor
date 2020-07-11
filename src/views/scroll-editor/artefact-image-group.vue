<template>
    <g
        :class="{disabled: disabled}"
        v-if="loaded"
        :key="artefact.id"
        :transform="groupTransform"
        :data="artefact.zOrder"
        pointer-events="all"
        @pointerdown="pointerDown($event)"
        @pointermove="pointerMove($event)"
        @pointerup="pointerUp($event)"
        @pointercancel="pointerCancel($event)"
    >
        <defs>
            <path :id="`path-${artefact.id}`" :d="artefact.mask.svg" />
            <clipPath :id="`clip-path-${artefact.id}`">
                <use stroke="none" fill="black" fill-rule="evenodd" :href="`#path-${artefact.id}`" />
            </clipPath>
        </defs>
        <g @click="onSelect()">
            <g :clip-path="`url(#clip-path-${artefact.id})`">
                <image
                    :width="boundingBox.width"
                    :height="boundingBox.height"
                    :transform="imageTransform"
                    :xlink:href="masterImageUrl"
                />
            </g>
            <path
                class="selected"
                v-if="selected"
                :d="artefact.mask.svg"
                vector-effect="non-scaling-stroke"
            />
        </g>
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
import { Component, Prop, Vue, Mixins, Emit } from 'vue-property-decorator';
import { Artefact } from '@/models/artefact';
import ArtefactDataMixin from '@/components/artefact/artefact-data-mixin';
import { Polygon } from '@/utils/Polygons';
import { Point } from '@/utils/helpers';
import {
    ScrollEditorOperation,
    ArtefactPlacementOperation,
    ArtefactPlacementOperationType,
    GroupPlacementOperation
} from './operations';
import { Placement } from '../../utils/Placement';
import { ArtefactGroup } from '@/models/edition';

@Component({
    name: 'artefact-image-group'
})
export default class ArtefactImageGroup extends Mixins(ArtefactDataMixin) {
    @Prop({
        default: false
    })
    public selected!: boolean;
    @Prop({
        default: false
    })
    public disabled!: boolean;
    @Prop() public readonly transformRootId!: string;
    @Prop()
    private selectedGroup: ArtefactGroup = ArtefactGroup.generateGroup([]);
    private mouseOrigin?: Point;
    private loaded = false;
    private pointerId: number = -1;
    private element!: SVGGElement | null;
    private previousPlacement!: any[];

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
        const placement = this.artefact.placement;
        if (!placement.scale) {
            return ''; // No transform at all, do nothing
        }

        // First, move bounding box's center to (0, 0)
        const midX = this.boundingBox.x + this.boundingBox.width / 2;
        const midY = this.boundingBox.y + this.boundingBox.height / 2;
        const translateToZero = `translate(-${midX}, -${midY})`;

        // Now, scale and rotate around (0 ,0)
        const scale = `scale(${placement.scale})`; // Scale by scale of transform
        const rotate = `rotate(${placement.rotate})`;

        // Finally, move to correct place. Remember that at this point the artefact's top left is (-midX, -midY)
        const translateX = this.boundingBox.width / 2 + placement.translate.x!;
        const translateY = this.boundingBox.height / 2 + placement.translate.y!;
        const translateToPlace = `translate(${translateX}, ${translateY})`;

        // Transformations are performed by SVG from right to left
        return `${translateToPlace} ${rotate} ${scale} ${translateToZero}`;
    }

    private get svg(): SVGSVGElement {
        return this.$el.closest('svg') as SVGSVGElement;
    }

    private get transformRoot(): SVGGraphicsElement {
        return this.svg.getElementById(
            this.transformRootId
        ) as SVGGraphicsElement;
    }

    protected async mounted() {
        await this.mountedDone;
        this.loaded = true;
    }

    @Emit()
    private onSelect(): boolean {
        return true;
    }
    private eventToPoint($event: PointerEvent): Point {
        // Changing coordinate systems taken from:
        // https://www.sitepoint.com/how-to-translate-from-dom-to-svg-coordinates-and-back-again/
        const pt = this.svg.createSVGPoint();
        pt.x = $event.clientX;
        pt.y = $event.clientY;
        const svgPt = pt.matrixTransform(
            this.transformRoot.getScreenCTM()!.inverse()
        );

        return svgPt;
    }
    private get selectedArtefacts(): Array<Artefact | undefined> {
        return this.selectedGroup.artefactIds.map((x: number) =>
            this.$state.artefacts.find(x)
        );
    }

    private pointerDown($event: PointerEvent) {
        if (this.pointerId > 0) {
            return;
        }
        this.previousPlacement = this.selectedArtefacts.map(art => ({
            placement: art!.placement.clone(),
            artefactId: art!.id
        }));

        this.pointerId = $event.pointerId;
        this.element = ($event.target! as HTMLBaseElement)!.closest('g');

        (($event.target as HTMLBaseElement) || this.element).setPointerCapture(
            this.pointerId
        );

        const pt = this.eventToPoint($event);
        this.mouseOrigin = { x: pt.x, y: pt.y };
    }

    private pointerMove($event: PointerEvent) {
        if (
            !this.mouseOrigin ||
            !this.selected ||
            this.pointerId !== $event.pointerId
        ) {
            return;
        }

        const pt = this.eventToPoint($event);

        const diffPt = {
            x: pt.x - this.mouseOrigin!.x,
            y: pt.y - this.mouseOrigin!.y
        };

        this.selectedArtefacts.forEach(art => {
            art!.placement.translate.x! += diffPt.x;
            art!.placement.translate.y! += diffPt.y;
        });

        this.mouseOrigin.x = pt.x;
        this.mouseOrigin.y = pt.y;
    }

    private pointerUp($event: PointerEvent) {
        const operations: ScrollEditorOperation[] = [];
        if (this.pointerId !== $event.pointerId || !this.selected) {
            this.cancelOperation($event.target as HTMLBaseElement);
            return;
        }
        this.selectedArtefacts.forEach(art => {
            const trans = art!.placement.clone();
            operations.push(this.createOperation('translate', trans, art));
        });

        const groupPlacementOperations = new GroupPlacementOperation(
            this.selectedGroup.groupId,
            operations
        );
        this.newOperation(groupPlacementOperations);

        this.cancelOperation($event.target as HTMLBaseElement);
    }

    private pointerCancel() {
        this.cancelOperation();
    }

    private createOperation(
        opType: ArtefactPlacementOperationType,
        newPlacement: Placement,
        artefact: Artefact | undefined
    ): ArtefactPlacementOperation {
        const op = new ArtefactPlacementOperation(
            artefact!.id,
            opType,
            this.previousPlacement.find(x => x.artefactId === artefact!.id).placement,
            newPlacement
        );
        return op;
    }

    private cancelOperation(targetElement?: HTMLBaseElement) {
        this.mouseOrigin = undefined;
        (targetElement || this.element)!.releasePointerCapture(this.pointerId);
        this.element = null;
        this.pointerId = -1;
    }

    @Emit()
    private newOperation(op: ScrollEditorOperation) {
        return op;
    }
}
</script>

<style lang="scss" scoped>
/* path {
    stroke-width: 1;
    stroke: black;
} */

path.selected {
    stroke-width: 2;
    fill-opacity: 0.3;
    stroke: blue;
    fill: aliceblue;
}

.disabled {
    cursor: not-allowed;
}
</style>                 