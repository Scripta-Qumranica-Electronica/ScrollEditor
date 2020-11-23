<template>
    <g
        :class="{ disabled: disabled }"
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
                <use
                    stroke="none"
                    fill="black"
                    fill-rule="evenodd"
                    :href="`#path-${artefact.id}`"
                />
            </clipPath>
        </defs>
        <g @click="onSelect">
            <g :clip-path="`url(#clip-path-${artefact.id})`">
                <iiif-image
                    :image="masterImage"
                    :boundingBox="boundingBox"
                    :scaleFactor="scaleFactor"
                />
            </g>
            <path
                class="selected"
                v-if="selected"
                :d="artefact.mask.svg"
                vector-effect="non-scaling-stroke"
            />
        </g>
        <roi-layer v-if="withRois" :rois="visibleRois"></roi-layer>
        <roi-layer v-if="reconstructedText" :withLetters="true" :rois="reconstructedRois">
        </roi-layer>
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
import { Component, Prop, Mixins, Emit } from 'vue-property-decorator';
import { Artefact } from '@/models/artefact';
import ArtefactDataMixin from '@/components/artefact/artefact-data-mixin';
import { Point } from '@/utils/helpers';
import {
    ScrollEditorOperation,
    ArtefactPlacementOperation,
    ArtefactPlacementOperationType,
    GroupPlacementOperation,
} from './operations';
import { Placement } from '../../utils/Placement';
import IIIFImageComponent from '@/components/images/IIIFImage.vue';
import { InterpretationRoi } from '@/models/text';
import RoiLayer from '../artefact-editor/roi-layer.vue';

@Component({
    name: 'artefact-image-group',
    components: {
        'iiif-image': IIIFImageComponent,
        'roi-layer': RoiLayer,
    },
})
export default class ArtefactImageGroup extends Mixins(ArtefactDataMixin) {
    @Prop({
        default: false,
    })
    public selected!: boolean;
    @Prop({
        default: false,
    })
    public disabled!: boolean;
    @Prop({
        default: false,
    })
    public withRois!: boolean;
    @Prop({
        default: false,
    })
    public reconstructedText!: boolean;
    @Prop({
        default: undefined,
    })
    public artefact!: Artefact;
    @Prop() public readonly transformRootId!: string;
    private mouseOrigin?: Point;
    private loaded = false;
    private pointerId: number = -1;
    private element!: SVGGElement | null;
    private previousPlacement!: any[];
    @Prop({
        default: 1,
    })
    private scaleFactor!: number;

    get masterImage() {
        return this.imageStack!.master;
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

    private get visibleRois(): InterpretationRoi[] {
        const visibleRois: InterpretationRoi[] = [];
        for (const roi of this.$state.interpretationRois.getItems()) {
            if (
                roi.status !== 'deleted' &&
                roi.artefactId === this.artefact.id
            ) {
                visibleRois.push(roi);
            }
        }

        return visibleRois;
    }

    private get reconstructedRois() {
        const reconstructedRois: InterpretationRoi[] = [];
        for (const roi of this.visibleRois) {
            if (
                this.$state.signInterpretations.get(roi.signInterpretationId!)!
                    .isReconstructed
            ) {
                reconstructedRois.push(roi);
            }
        }

        return reconstructedRois;
    }

    protected async mounted() {
        await this.mountedDone;
        this.loaded = true;
    }

    @Emit()
    private onSelect(event: MouseEvent): Artefact {
        event.stopPropagation();
        return this.artefact;
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

    public get selectedGroup() {
        return this.$state.scrollEditor.selectedGroup;
    }

    public get selectedArtefact() {
        return this.$state.scrollEditor.selectedArtefact;
    }

    private get selectedArtefacts() {
        return this.$state.scrollEditor.selectedArtefacts;
    }

    private pointerDown($event: PointerEvent) {
        if (this.pointerId > 0) {
            return;
        }
        this.previousPlacement = this.selectedArtefacts.map((art) => ({
            placement: art!.placement.clone(),
            artefactId: art!.id,
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
            y: pt.y - this.mouseOrigin!.y,
        };

        this.selectedArtefacts.forEach((art) => {
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

        let operation: ScrollEditorOperation = {} as ScrollEditorOperation;
        if (this.selectedArtefact) {
            operation = this.createOperation(
                'translate',
                this.selectedArtefact.placement.clone(),
                this.selectedArtefact
            );
        }
        if (this.selectedGroup) {
            this.selectedArtefacts.forEach((art) => {
                const trans = art!.placement.clone();
                operations.push(this.createOperation('translate', trans, art));
            });

            operation = new GroupPlacementOperation(
                this.selectedGroup.groupId,
                operations
            );
        }

        this.newOperation(operation);

        this.cancelOperation($event.target as HTMLBaseElement);
    }

    private pointerCancel() {
        this.cancelOperation();
    }

    private createOperation(
        opType: ArtefactPlacementOperationType,
        newPlacement: Placement,
        artefact: Artefact | undefined,
        newIsPlaced: boolean = true
    ): ArtefactPlacementOperation {
        const op = new ArtefactPlacementOperation(
            artefact!.id,
            opType,
            this.previousPlacement.find(
                (x) => x.artefactId === artefact!.id
            ).placement,
            newPlacement,
            artefact!.isPlaced,
            newIsPlaced
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