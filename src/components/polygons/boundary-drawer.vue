<template>
    <g
        v-bind:class="[waiting ? 'disabled' : '', svgClass]"
        pointer-events="all"
        @pointerdown="pointerDown($event)"
        @pointermove="pointerMove($event)"
        @pointerup="pointerUp($event)"
        @pointercancel="pointerCancel($event)"
        @keypress="keyPress($event)"
    >
        <!-- add an invisible rectangle so that pointer events work -->
        <rect style="stroke: none; fill: none" width="10000" height="10000" />
        <polygon v-if="closedPolygon" :points="polygonString" :style="polygonStyle" />
        <polyline v-else :points="polygonString" :style="polylineStyle" />
    </g>
</template>

<script lang="ts">
import { Component, Prop, Vue, Watch, Emit } from 'vue-property-decorator';
import { Point } from '@/utils/helpers';
import { Polygon } from '@/utils/Polygons';
import UtilsService from '@/services/utils';
export type ActionMode = 'select' | 'polygon' | 'box';
type InternalMode =
    | 'before-polygon'
    | 'polygon'
    | 'before-corner1'
    | 'before-corner2';

@Component({
    name: 'boundary-drawer'
})
export default class BoundaryDrawer extends Vue {
    @Prop({
        default: 'polygon'
    })
    public readonly mode!: ActionMode;
    @Prop({
        default: 'purple'
    })
    public readonly color!: string;
    @Prop() public readonly transformRootId!: string;

    private internalMode: InternalMode = 'before-polygon';
    private utilsService: UtilsService = new UtilsService();
    private waiting = false;
    // corner1 and corner2 are the two corners of the box in box mode,
    // or of the polygon's bounding box in polygon mode
    private corner1?: Point;
    private corner2?: Point;

    // The list of points of the polygon
    private polygonPoints: Point[] = [];

    // We only support single touch events. When a second pointer is used,
    // we cancel everything
    private activePointers: Set<number> = new Set<number>();
    private get polygonString(): string {
        const pts = this.polygonPoints.map(pt => `${pt.x}, ${pt.y}`);
        return pts.join(' ');
    }

    private get polygonStyle(): string {
        return `stroke: ${this.color};`;
    }

    private get polylineStyle(): string {
        return `stroke: ${this.color};`;
    }

    // True when the polygon is closed
    private closedPolygon: boolean = false;

    private created() {
        this.onModeChanged(this.mode);
    }

    @Watch('mode')
    private onModeChanged(newMode: ActionMode) {
        if (this.mode === 'polygon') {
            this.internalMode = 'before-polygon';
        } else if (this.mode === 'box') {
            this.internalMode = 'before-corner1';
        }
        this.pointerCancel();
    }

    private get svgClass() {
        if (
            this.internalMode === 'before-polygon' ||
            this.internalMode === 'polygon'
        ) {
            return ['draw-boundary'];
        }
        if (this.internalMode === 'before-corner1') {
            return ['draw-first-corner'];
        }

        if (this.internalMode === 'before-corner2') {
            return ['draw-second-corner'];
        }

        return [];
    }

    private pointerDown($event: PointerEvent) {
        this.activePointers.add($event.pointerId);
        if (this.activePointers.size > 1) {
            this.cancelOperation();
            return;
        }

        const pt = this.eventToPoint($event);
        this.closedPolygon = false;
        if (this.internalMode === 'before-corner1') {
            this.internalMode = 'before-corner2';
        } else if (this.internalMode === 'before-polygon') {
            this.corner1 = this.corner2 = pt;
            this.internalMode = 'polygon';
        }

        this.corner1 = { x: pt.x, y: pt.y };
        this.corner2 = { x: pt.x, y: pt.y };
        this.polygonPoints = [pt];
    }

    private pointerMove($event: PointerEvent) {
        if (this.activePointers.size > 1 || this.waiting) {
            return;
        }

        const pt = this.eventToPoint($event);
        if (this.internalMode === 'before-corner2') {
            this.corner2 = pt;
            this.polygonPoints = [
                this.corner1!,
                { x: this.corner1!.x, y: this.corner2!.y },
                this.corner2!,
                { x: this.corner2!.x, y: this.corner1!.y }
            ];
            this.closedPolygon = true;
        } else if (this.internalMode === 'polygon') {
            this.polygonPoints!.push(this.eventToPoint($event));

            // Update the polygon's bounding box
            if (pt.x < this.corner1!.x) {
                this.corner1!.x = pt.x;
            }
            if (pt.y < this.corner1!.y) {
                this.corner1!.y = pt.y;
            }
            if (pt.x > this.corner2!.x) {
                this.corner2!.x = pt.x;
            }
            if (pt.y > this.corner2!.y) {
                this.corner2!.y = pt.y;
            }

            this.closedPolygon = false;
        }
    }

    // Check if a polygon is closed.
    // This is done by looking at the distance between the last point and the first point. If they
    // are close enough (less than 5% of the diagonal of the polygon's bounding box),
    // the polygon is considered closed.
    private checkPolygonCloseness(): boolean {
        const threshold = 0.25;

        const width = this.corner1!.x - this.corner2!.x; // No Math.abs since we square these
        const height = this.corner1!.y - this.corner2!.y;
        const diagonal2 = width * width + height * height;

        const pt0 = this.polygonPoints[0];
        const pt1 = this.polygonPoints[this.polygonPoints.length - 1];
        const dist2 =
            (pt0.x - pt1.x) * (pt0.x - pt1.x) +
            (pt0.y - pt1.y) * (pt0.y - pt1.y);

        const ratio = dist2 / diagonal2;

        return ratio < threshold * threshold;
    }

    private pointerCancel() {
        this.cancelOperation();
        this.activePointers = new Set<number>();
    }

    private cancelOperation() {
        this.corner1 = this.corner2 = undefined;
        this.polygonPoints = [];
        if (this.mode === 'polygon') {
            this.internalMode = 'before-polygon';
        } else if (this.mode === 'box') {
            this.internalMode = 'before-corner1';
        }
        this.closedPolygon = false;
    }

    private keyPress($event: KeyboardEvent) {
        if ($event.key === 'Escape') {
            this.cancelOperation();
            $event.preventDefault();
        }
    }

    private pointerUp($event: PointerEvent) {
        this.activePointers.delete($event.pointerId);

        // TODO: Make sure the polygon is closed
        if (this.mode === 'box' || !this.closedPolygon) {
            this.checkPolygon();
        }
        this.cancelOperation();
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

    private get svg(): SVGSVGElement {
        return this.$el.closest('svg') as SVGSVGElement;
    }

    private get transformRoot(): SVGGraphicsElement {
        return this.svg.getElementById(
            this.transformRootId
        ) as SVGGraphicsElement;
    }

    @Emit()
    private newPolygon(polygon: Polygon) {
        return polygon;
    }

    private async checkPolygon() {
        // Turn the polygon into an svg string, due it bit by bit
        const partials = [
            `M${this.polygonPoints[0].x} ${this.polygonPoints[0].y}`
        ];
        for (let i = 1; i < this.polygonPoints.length; i++) {
            partials.push(
                `L${this.polygonPoints[i].x} ${this.polygonPoints[i].y}`
            );
        }
        partials.push(`L${this.polygonPoints[0].x} ${this.polygonPoints[0].y}`);

        const svg = partials.join(' ');
        const polygon = new Polygon(svg);

        if (polygon.isLegal()) {
            this.newPolygon(polygon);
        } else {
            try {
                this.waiting = true;
                const fixedPolygon = await this.utilsService.repairPolygon(
                    polygon
                );
                this.newPolygon(fixedPolygon);
            } catch (e) {
                this.$toasted.show('Error trying to repair polygon..', {
                    type: 'error',
                    position: 'top-right',
                    duration: 3000
                });
            } finally {
                this.waiting = false;
            }
        }
    }
}
</script>

<style lang="scss" scoped>
$crosshair: url('/assets/cursors/crosshair.svg'), crosshair;
$crosshair1: url('/assets/cursors/crosshair1.svg'), crosshair;
$crosshair2: url('/assets/cursors/crosshair2.svg'), crosshair;

.draw-first-corner {
    cursor: $crosshair1;
}

.draw-second-corner {
    cursor: $crosshair2;
}

.draw-boundary {
    cursor: $crosshair;

    &.disabled {
        cursor: wait;
        rect {
            fill: #f8f9fa !important;
            opacity: 0.8;
        }
    }
}

polygon {
    fill: white;
    fill-opacity: 0.1;
    stroke-width: 6;
}

polyline {
    stroke-width: 5;
    fill: none;
}
</style>
