<template>
    <svg v-show="activeMode !== 'none'"
         v-bind:class='[svgClass]'
         :width="width"
         :height="height"
         :viewBox="`${boundingBox.x} ${boundingBox.y} ${boundingBox.width} ${boundingBox.height}`"
         @pointerdown="pointerDown($event)"
         @pointermove="pointerMove($event)"
         @pointerup="pointerUp($event)"
         @pointercancel="pointerCancel($event)"
         @keypress="keyPress($event)">
         <polygon v-if="closedPolygon" :points="polygonPointsString"/>
         <polyline v-else :points="polyognPointsString"/>
    </svg>
</template>

<script lang="ts">
import { Component, Prop, Vue, Watch, Emit } from 'vue-property-decorator';
import { BoundingBox, Point } from '@/utils/helpers';
import { Polygon } from '@/utils/Polygons';

export type DrawingMode = 'none' | 'polygon' | 'box';
type InternalMode = 'none' | 'before-polygon' | 'polygon' | 'before-corner1' | 'before-corner2';

@Component({
    name: 'boundary-drawer',
})
export default class BoundaryDrawer extends Vue {
    @Prop() public readonly width!: number;
    @Prop() public readonly height!: number;
    @Prop() public readonly boundingBox: BoundingBox | undefined;
    @Prop({
        default: 'none',
    }) public readonly mode!: DrawingMode;

    private activeMode: DrawingMode = 'none';
    private internalMode: InternalMode = 'none';

    // corner1 and corner2 are the two corners of the box in box mode,
    // or of the polygon's bounding box in polygon mode
    private corner1?: Point;
    private corner2?: Point;

    // The list of points of the polygon
    private polygonPoints: Point[] = [];

    // True when the polygon is closed
    private closedPolygon: boolean = false;

    private created() {
        this.onModeChanged(this.mode);
    }

    @Watch('mode')
    private onModeChanged(newMode: DrawingMode) {
        this.activeMode = newMode;
        if (this.activeMode === 'none') {
            this.internalMode = 'none';
        } else if (this.activeMode === 'polygon') {
            this.internalMode = 'before-polygon';
            this.polygonPoints = [];
        } else if (this.activeMode === 'box') {
            this.internalMode = 'before-corner1';
            this.corner1 = this.corner2 = undefined;
        }
    }

    private get svgClass() {
        if (this.internalMode === 'before-polygon' || this.internalMode === 'polygon') {
            return ['crosshair'];
        }
        if (this.internalMode === 'before-corner1') {
            return ['crosshair1'];
        }

        if (this.internalMode === 'before-corner2') {
            return ['crosshair2'];
        }

        return [];
    }

    private pointerDown($event: PointerEvent) {
        const pt = this.eventToPoint($event);
        this.closedPolygon = false;
        if (this.internalMode === 'before-corner1') {
            this.corner1 = this.corner2 = pt;
            this.internalMode = 'before-corner2';
        } else if (this.internalMode === 'before-polygon') {
            this.polygonPoints = [pt];
            this.corner1 = this.corner2 = pt;
            this.internalMode = 'polygon';
        }
    }

    private pointerMove($event: PointerEvent) {
        const pt = this.eventToPoint($event);
        if (this.internalMode === 'before-corner2') {
            this.corner2 = pt;
            this.polygonPoints = [this.corner1!,
                { x: this.corner1!.x, y: this.corner2!.y },
                this.corner2!,
                { x: this.corner2!.x, y: this.corner1!.y },
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

            this.closedPolygon = this.checkPolygonCloseness();
        }
    }

    // Check if a polygon is closed.
    // This is done by looking at the distance between the last point and the first point. If they
    // are close enough (less than 5% of the diagonal of the polygon's bounding box),
    // the polygon is considered closed.
    private checkPolygonCloseness(): boolean {
        const width = this.corner1!.x - this.corner2!.x;  // No Math.abs since we square these
        const height = this.corner1!.y - this.corner2!.y;
        const diagonal2 = width * width + height * height;

        const pt0 = this.polygonPoints[0];
        const pt1 = this.polygonPoints[this.polygonPoints.length - 1];
        const dist2 = (pt0.x - pt1.x) * (pt0.x - pt1.x) + (pt0.y - pt1.y) * (pt0.y - pt1.y);

        // Now return true of sqrt(dist2) / sqrt(diagonal2) < 0.05
        return dist2 / diagonal2 < (0.05 * 0.05);
    }

    private pointerCancel() {
        if (this.activeMode === 'polygon') {
            this.polygonPoints = [];
            this.internalMode = 'before-polygon';
        } else if (this.activeMode === 'box') {
            this.corner1 = this.corner2 = undefined;
            this.internalMode = 'before-corner1';
        }
    }

    private keyPress($event: KeyboardEvent) {
        if ($event.key === 'Escape') {
            this.pointerCancel();
            $event.preventDefault();
        }
    }

    private pointerUp() {
        // TODO: Make sure the polygon is closed
        if (this.closedPolygon) {
            this.newPolygon();
        }
        this.activeMode = 'none';
        this.internalMode = 'none';
    }

    private eventToPoint($event: PointerEvent): Point {
        // Changing coordinate systems taken from:
        // https://www.sitepoint.com/how-to-translate-from-dom-to-svg-coordinates-and-back-again/
        const pt = this.svg.createSVGPoint();
        pt.x = $event.clientX;
        pt.y = $event.clientY;
        const svgPt = pt.matrixTransform(this.svg.getScreenCTM()!.inverse());

        return svgPt;
    }

    @Emit()
    private newPolygon() {
        // Turn the polygon into an svg string, due it bit by bit
        const partials = [`M${this.polygonPoints[0].x} ${this.polygonPoints[0].y}`];
        for (let i = 1; i < this.polygonPoints.length; i++) {
            partials.push(`L${this.polygonPoints[i].x} ${this.polygonPoints[i].y}`);
        }
        partials.push(`L${this.polygonPoints[0].x} ${this.polygonPoints[0].y}`);

        const svg = partials.join(' ');
        return new Polygon(svg);
    }

    private get svg(): SVGSVGElement {
        return this.$el as SVGSVGElement;
    }
}

</script>

<style lang="scss" scoped>

$crosshair: url('/assets/cursors/crosshair.svg') crosshair;
$crosshair1: url('/assets/cursors/crosshair1.svg') crosshair;
$crosshair2: url('/assets/cursors/crosshair2.svg') crosshair;

.draw-first-corner {
    cursor: $crosshair1
}

.draw-second-corner {
    cursor: $crosshair2
}

.draw-boundary {
    cursor: $crosshair
}

polygon {
    fill: white;
    fill-opacity: 0.1;
    stroke: white;
    stroke-width: 2;
}

polyline {
    stroke: yellow;
    stroke-width: 2;
}

</style>
