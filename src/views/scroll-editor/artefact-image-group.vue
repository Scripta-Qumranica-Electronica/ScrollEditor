<template>
    <g
        :class="{ disabled: disabled }"
        v-if="loaded"
        :key="artefact.id"
        :transform="groupTransform"
        :data="artefact.zOrder"
        pointer-events="all"
        @pointerdown="onPointerDown($event)"
        @pointermove="onPointerMove($event)"
        @pointerup="onPointerUp($event)"
        @pointercancel="onPointerCancel($event)"
        @click="onClick($event)"
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
            <g :clip-path="`url(#clip-path-${artefact.id})`"
                v-if="!artefact.isVirtual">
                <iiif-image
                    :image="masterImage"
                    :boundingBox="boundingBox"
                    :scaleFactor="scaleFactor"
                />
            </g>
            <path v-if="artefact.isVirtual"
                class="virtual-artefact"
                :d="artefact.mask.svg"
                vector-effect="non-scaling-stroke"/>
            <path
                class="selected"
                v-if="selected"
                :d="artefact.mask.svg"
                vector-effect="non-scaling-stroke"
            />
        </g>
        <roi-layer
            v-if="withRois"
            :withClass="false"
            :rois="visibleRois"
        ></roi-layer>
        <template v-if="displayText || reconstructedText">
            <use v-for="d in displayedSigns"
                 :data-sign-id="d.id"
                 :key="d.id"
                 :href="`#path-${d.character}`"
                 class="sign"
                 :class="{selected: d.id === selectedSignInterpretationId}"
                 :transform="d.svgTransform" />
        </template>
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
import { BoundingBox, Point } from '@/utils/helpers';
import {
    ScrollEditorOperation,
    ArtefactPlacementOperation,
    ArtefactPlacementOperationType,
    GroupPlacementOperation,
} from './operations';
import { Placement } from '../../utils/Placement';
import IIIFImageComponent from '@/components/images/IIIFImage.vue';
import { InterpretationRoi, SignInterpretation } from '@/models/text';
import RoiLayer from '../artefact-editor/roi-layer.vue';

class DisplayableSign {
    public id: number;
    public character: string;
    public boundingBox: BoundingBox;
    public yOffset: number = 0;

    public constructor( si: SignInterpretation,
                        rois: InterpretationRoi[],
                        yOffset: number ) {
        if (!si.character) {
            throw new Error('DisplayedSign with no character');
        }

        if (!rois || !rois.length) {
            throw new Error('DIsplayedSign with no rois');
        }

        this.id = si.id;
        this.character = si.character;
        this.yOffset = yOffset;

        this.boundingBox = this.calculateBoundingBox(rois);
    }

    private calculateBoundingBox(rois: InterpretationRoi[]): BoundingBox {
        const boundingBoxes: BoundingBox[] = [];

        for (const roi of rois) {
            const bbox = roi.shape.getBoundingBox();
            bbox.x = roi.position.x;
            bbox.y = roi.position.y;

            boundingBoxes.push(bbox);
        }

        return BoundingBox.combine(boundingBoxes);
    }

    public get svgTransform() {
        const x = this.boundingBox.x;
        const y = this.boundingBox.y; //  - this.yOffset;

        return `translate(${x} ${y})`;
    }
}

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
    public displayText!: boolean;

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
        const scaleMirrored = placement.mirrored ? 'scale(-1, 1)' : '';

        // Finally, move to correct place. Remember that at this point the artefact's top left is (-midX, -midY)
        const translateX = this.boundingBox.width / 2 + placement.translate.x!;
        const translateY = this.boundingBox.height / 2 + placement.translate.y!;
        const translateToPlace = `translate(${translateX}, ${translateY})`;

        // Transformations are performed by SVG from right to left
        return `${translateToPlace} ${rotate} ${scale} ${scaleMirrored} ${translateToZero}`;
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

    private get visibleSignInterpretations(): SignInterpretation[] {
        const siSet = new Set<SignInterpretation>();


        for (const roi of this.visibleRois) {

            const siId = roi.signInterpretationId;
            if (siId === undefined) {
                continue;
            }
            const si = this.$state.signInterpretations.get(siId);
            if (!si) {
                console.warn(`Can't locate sin ${siId} in manuscript editor`);
                continue;
            }

            siSet.add(si);
        }

        return [...siSet];
    }

    public get selectedSignInterpretationId() {
        if (this.$state.scrollEditor.selectedSignInterpretations.length !== 1) {
            return null;
        }

        return this.$state.scrollEditor.selectedSignInterpretations[0].signInterpretationId;
    }

    public get displayedSigns(): DisplayableSign[] {
        const reconstructedOnly = this.reconstructedText && !this.displayText;
        const displayedSigns: DisplayableSign[] = [];

        for (const si of this.visibleSignInterpretations) {


            if (reconstructedOnly && !si.isReconstructed) {
                continue;
            }

            if (!si.character) {
                continue;
            }

            const yOffset = this.$state.editions.current?.script?.glyphs[si.character]?.yOffset || 0;
            const displayedSign = new DisplayableSign(si, si.rois, yOffset);
            displayedSigns.push(displayedSign);
        }

        return displayedSigns;
    }

    protected async mounted() {

        // await this.mountedDone;
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

    // Implement dragging artefacts - but only in material mode.
    private onPointerDown($event: PointerEvent) {
        if (!this.materialMode) {
            return;
        }

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

    private onPointerMove($event: PointerEvent) {
        if (!this.materialMode) {
            return;
        }

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

    private onPointerUp($event: PointerEvent) {
        if (!this.materialMode) {
            return;
        }

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

    private onPointerCancel() {
        if (!this.materialMode) {
            return;
        }

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

    private get materialMode() {
        return this.$state.scrollEditor.mode === 'material';
    }


    @Emit()
    private newOperation(op: ScrollEditorOperation) {
        return op;
    }

    public onClick(event: MouseEvent) {
        if (this.materialMode) {
            return;
        }
        this.$state.scrollEditor.selectedSignInterpretations = [];

        // Find the letter this this event applies to, if any
        const element = (event.target! as HTMLBaseElement)!.closest('use');
        if (!element) {
            return;
        }

        const sid = element.getAttribute('data-sign-id');
        if (!sid) {
            return;
        }

        const id = parseInt(sid);
        const si = this.$state.signInterpretations.get(id, true);

        if (si) {
            this.$state.scrollEditor.selectedSignInterpretations = [si];
        }
    }
}
</script>

<style lang="scss" scoped>
@import '@/assets/styles/_variables.scss';
@import '@/assets/styles/_fonts.scss';

path.virtual-artefact {
    stroke-width: 1;
    fill-opacity: 0.3;
    stroke: $virtual-artefact-outline-color;
}

path.selected {
    stroke-width: 2;
    fill-opacity: 0.3;
    stroke: blue;
    fill: aliceblue;
}

.disabled {
    cursor: not-allowed;
}

.sign {
    fill: black;
    stroke: black;
}

.sign.selected {
    fill: red;
    stroke: red;
}

</style>