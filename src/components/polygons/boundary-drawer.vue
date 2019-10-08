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
    </svg>
</template>

<script lang="ts">
import { Component, Prop, Vue, Watch, Emit } from 'vue-property-decorator';
import { BoundingBox, Point } from '@/utils/helpers';

export type DrawingMode = 'none' | 'polygon' | 'box';
type InternalMode = 'none' | 'before-polygon' | 'polygon' | 'before-corner1' | 'before-corner2';

@Component({
    name: 'boundary-drawer',
})
export default class BoundaryDrawer extends Vue {
    @Prop() readonly width!: number;
    @Prop() readonly height!: number;
    @Prop() readonly boundingBox: BoundingBox | undefined;
    @Prop({
        default: 'none',
    }) readonly mode!: DrawingMode;

    private activeMode: DrawingMode = 'none';
    private internalMode: InternalMode = 'none';

    private corner1?: Point;
    private corner2?: Point;
    private polygonPoints?: Point[];

    created() {
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
            return ['crosshair']
        }
        if (this.internalMode === 'before-corner1') {
            return ['crosshair1'];
        }

        if(this.internalMode === 'before-corner2') {
            return ['crosshair2'];
        }

        return [];
    }

    private pointerDown($event: PointerEvent) {
        if (this.internalMode === 'before-corner1') {
            this.corner1 = this.corner2 = this.eventToPoint($event);
            this.internalMode = 'before-corner2';
        } else if (this.internalMode === 'before-polygon') {
            this.polygonPoints = [this.eventToPoint($event)];
            this.internalMode = 'polygon';
        }
    }

    private pointerMove($event: PointerEvent) {
        if (this.internalMode === 'before-corner2') {
            this.corner2 = this.eventToPoint($event);
        } else if (this.internalMode === 'polygon') {
            this.polygonPoints!.push(this.eventToPoint($event));
        }
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
        if($event.key === 'Escape') {
            this.pointerCancel();
        }
    }

    private pointerUp() {
        // TODO: Make sure the polygon is closed
        this.newPolygon();
        this.activeMode = 'none';
        this.internalMode = 'none';
    }

    private eventToPoint($event: PointerEvent) {
        return {
            x: $event.clientX,
            y: $event.clientY,
        } as Point;
    }

    @Emit()
    private newPolygon() {
        if (this.activeMode === 'box') {
            this.polygonPoints = [this.corner1!, this.corner2!, this.corner1!];
        }

        const points = this.polygonPoints!.map((pt) => `${pt.x} ${pt.y}`).join(' ');
        return `POLYGON ((${points}))`;
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
</style>
