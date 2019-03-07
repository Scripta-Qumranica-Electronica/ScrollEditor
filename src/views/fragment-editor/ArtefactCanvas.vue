<template>
  <div 
    ref="artefactOverlay"
    class="artefactOverlay"
    id="artefactOverlay"
    :class="{ editable: editable, zoom: zooming }"
    :width="width"
    :height="height"
    style="top: 0px; left: 0px;"
    :style="{transform: `scale(${scale * maskShrinkFactor})`}">
    <div :style="{transform: `rotate(${params.rotationAngle}deg`}">
      <canvas
        id="maskCanvas"
        class="maskCanvas"
        :class="{hidden: clip, pulse: editMode !== editModeDraw && selected}"
        ref="maskCanvas"
        :width="width / maskShrinkFactor"
        :height="height / maskShrinkFactor"
        @pointermove="pointerMove($event)"
        @pointerdown="pointerDown($event)"
        @pointerup="pointerUp($event)"
        @wheel="onMouseWheel"
      >
      </canvas>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import { Matrix } from '@/utils/Matrices';

enum EditMode {
    DRAWING, ADJUSTING, NONE
}

// tslint:disable:no-var-requires
const trace = require('@/utils/Potrace.js').trace;
// tslint:enable:no-var-requires

import {
  clipCanvas,
  wktPolygonToSvg,
  svgPolygonToGeoJSON,
  svgPolygonToClipper,
  clipperToSVGPolygon,
} from '@/utils/VectorFactory';
import { EditorParams,
         DrawingMode,
         MaskChangeOperation,
         ZoomRequestEventArgs,
         AdjustmentData } from './types';
import { Fragment } from '@/models/fragment';
import { Artefact } from '@/models/artefact';
import { Polygon } from '@/utils/Polygons';
import { PointerTracker, PointerTrackingEvent, Position } from '@/utils/PointerTracker';

export default Vue.extend({
  props: {
    params: EditorParams,
    fragment: Fragment,
    artefact: Artefact,
    selected: Boolean,
    editable: Boolean,
    width: Number,
    height: Number,
  },
  data() {
    return {
      cursorPos: {} as Position,
      lastCursorPos: { } as Position,
      firstMoveOfDraw: false,
      mouseClientPosition: {} as Position,
      editMode: EditMode.NONE,
      editingCanvas: document.createElement('canvas'),
      currentClipperPolygon: [[]],
      cursorTransform: Matrix.unit(),
      zooming: false,
      maskShrinkFactor: 20,
      maskCanvasContext: { } as CanvasRenderingContext2D,
      editingCanvasContext: { } as CanvasRenderingContext2D,
      pointerTracker: new PointerTracker(),
      lastAdjData: { } as AdjustmentData,
      curAdjData: { } as AdjustmentData,
      adjFingerCount: 0,
    };
  },
  computed: {
    maskCanvas(): HTMLCanvasElement {
      return this.$refs.maskCanvas as HTMLCanvasElement;
    },
    scale(): number { // TODO: Rename scale to zoomFactor
      return this.params.zoom;
    },
    brushSize(): number {
      return this.params.brushSize;
    },
    clip(): boolean {
      return this.params.clipMask;
    },
    cursorColor(): string {
      return this.params.drawingMode === DrawingMode.DRAW ? 'yellow' : 'black';
    },
    rotateTransform(): string {
      return `rotate(${this.rotationAngle} ${this.width / 2} ${this.height / 2}`;
    },
    rotationAngle(): number {
      return this.params.rotationAngle;
    },
    clippingMask(): Polygon {
      return this.artefact.mask;
    },
    editModeDraw() {
      return EditMode.DRAWING;
    }
  },
  methods: {
    pointerDown(event: PointerEvent) {
      // console.log('down', event);
      if (!this.selected || !this.editable) {
        return;
      }
      if (event.ctrlKey || event.button !== 0) {
        return;
      }

      const exEvent = this.extendEvent(event);
      this.pointerTracker.handleEvent(exEvent);

      const count = this.pointerTracker.count;
      if (count === 2) {
        this.maskCanvasContext.restore();
        this.editingCanvasContext.restore();
        this.editMode = EditMode.ADJUSTING;
        this.lastAdjData = new AdjustmentData(this.pointerTracker.primary, this.pointerTracker.secondary);
        console.log('Switching to adjustment mode');
      } else if (count > 2) {
        this.editMode = EditMode.NONE;
        // console.log(`${count} fingers held down - ignoring everything`);
      } else if (count === 1) {
        // console.log('Switching to drawing mode');
        this.maskCanvasContext.save();
        this.editingCanvasContext.save();

        this.lastCursorPos = exEvent.logicalPosition;

        // Initialize the canvases
        this.editMode = EditMode.DRAWING;
        if (this.params.drawingMode === DrawingMode.DRAW) {
          this.maskCanvasContext.globalCompositeOperation = 'source-over';
        } else {
          this.maskCanvasContext.globalCompositeOperation = 'destination-out';
        }
        this.maskCanvasContext.fillStyle = this.artefact.color;
        this.maskCanvasContext.strokeStyle = this.artefact.color;

        this.editingCanvasContext.globalCompositeOperation = 'source-over';
        this.editingCanvasContext.fillStyle = this.artefact.color;
        this.editingCanvasContext.strokeStyle = this.artefact.color;
      }
    },
    pointerMove(event: PointerEvent) {
      if (!this.selected) {
        return;
      }
      this.zooming = event.ctrlKey;

      const exEvent = this.extendEvent(event);
      this.pointerTracker.handleEvent(exEvent);

      if (this.editMode === EditMode.DRAWING) {
        this.drawing();
      }
    },
    async pointerUp(event: PointerEvent) {
      // console.log('up ', event);
      if (!this.selected || !this.editable) {
        return;
      }

      const exEvent = this.extendEvent(event);
      this.pointerTracker.handleEvent(exEvent);
      // if (event.button !== 0) {
      //   return;
      // }

      if (this.editMode === EditMode.DRAWING) {
        this.drawPoint(this.lastCursorPos);
        await this.recalculateMask();
      }
      // console.log('Edit mode set to NONE');
      this.editMode = EditMode.NONE;
    },
    drawing() {
      // DRAWING means there's only one activate pointer, and this is it, so we don't need to consult
      // the pointerTracker to get the primary pointer.
      this.cursorPos = this.pointerTracker.primary.logicalPosition;
      this.drawPoint(this.lastCursorPos);
      this.drawLine(this.lastCursorPos, this.cursorPos);
      this.lastCursorPos = this.cursorPos;
    },
    drawPoint(pos: Position) {
      this.maskCanvasContext.beginPath();
      this.maskCanvasContext.arc(pos.x / this.scale / this.maskShrinkFactor,
                                 pos.y / this.scale / this.maskShrinkFactor,
                                 this.brushSize / 2 / this.scale / this.maskShrinkFactor,
                                 0, Math.PI * 2);
      this.maskCanvasContext.fill();
      this.maskCanvasContext.closePath();

      this.editingCanvasContext.beginPath();
      this.editingCanvasContext.arc(pos.x / this.scale,
                                    pos.y / this.scale,
                                    this.brushSize / 2 / this.scale,
                                    0, Math.PI * 2);
      this.editingCanvasContext.fill();
      this.editingCanvasContext.closePath();
    },
    drawLine(start: Position, end: Position) {
      this.maskCanvasContext.beginPath();
      this.maskCanvasContext.lineWidth = this.brushSize / this.scale / this.maskShrinkFactor;
      this.maskCanvasContext.moveTo(start.x / this.scale / this.maskShrinkFactor,
                                    start.y / this.scale / this.maskShrinkFactor);
      this.maskCanvasContext.lineTo(end.x / this.scale / this.maskShrinkFactor,
                                    end.y / this.scale / this.maskShrinkFactor);
      this.maskCanvasContext.stroke();
      this.maskCanvasContext.closePath();

      this.editingCanvasContext.beginPath();
      this.editingCanvasContext.lineWidth = this.brushSize / this.scale;
      this.editingCanvasContext.moveTo(start.x / this.scale, start.y / this.scale);
      this.editingCanvasContext.lineTo(end.x / this.scale, end.y / this.scale);
      this.editingCanvasContext.stroke();
      this.editingCanvasContext.closePath();
    },
    zoomLocation(deltaY: number) {
      this.zooming = true;
      const amount = deltaY < 0 ? +0.01 : -0.01; // wheel up - zoom in.
      this.$emit('zoomRequest', {
        amount,
        clientPosition: this.mouseClientPosition,
      } as ZoomRequestEventArgs);
    },
    onMouseWheel(event: WheelEvent) {
      if (!this.selected) {
        return;
      }
      // Only catch control-mousewheel
      if (!event.ctrlKey) {
        return;
      }
      event.preventDefault(); // Don't use the browser's zoom mechanism here, just ours
      this.zoomLocation(event.deltaY);
    },
    extendEvent(event: PointerEvent) {
      // The fragment editor only supports rotation by 90 degree increments.
      const element = event.target as HTMLElement;
      const initOffset = element.getBoundingClientRect();
      const rawPos = {
        x: event.clientX - initOffset.left + element.scrollLeft,
        y: event.clientY - initOffset.top + element.scrollTop,
      } as Position;

      const angle = ((this.rotationAngle % 360) + 360) % 360; // Handle negative numbers
      let rotatedPos = { ... rawPos };
      if (angle === 180) {
        rotatedPos = {
          x: this.width * this.scale - rawPos.x,
          y: this.height * this.scale - rawPos.y,
        };
      } else if (angle === 90) {
        rotatedPos = {
          x: rawPos.y,
          y: this.width * this.scale - rawPos.x,
        };
      } else if (angle === 270) {
        rotatedPos = {
          x: this.height * this.scale - rawPos.y,
          y: rawPos.x,
        };
      }

      const extended = new PointerTrackingEvent(event, rawPos);
      return extended;
    },
    async recalculateMask() {
      const canvas = this.editingCanvas;
      const canvasSvg: any = await trace(this.editingCanvas);
      const canvasPolygon = Polygon.fromSvg(canvasSvg);

      let newMask: Polygon;
      let deltaNeto: Polygon;
      if (this.clippingMask) {
        if (this.params.drawingMode === DrawingMode.DRAW) {
          newMask = Polygon.add(this.clippingMask, canvasPolygon);
          // canvasPolygon is the delteGross, we have to find the deltaNeto according to old mask and new mask.
          deltaNeto = Polygon.subtract(newMask, this.clippingMask);
        } else {
          newMask = Polygon.subtract(this.clippingMask, canvasPolygon);
          deltaNeto = Polygon.subtract(this.clippingMask, newMask);
        }
      } else {
        newMask = canvasPolygon;
        deltaNeto = canvasPolygon;
      }

      const ctx = this.editingCanvas.getContext('2d');
      if (ctx === null) {
        throw new Error('Received null editing canvas context');
      }
      ctx.clearRect(0, 0, this.editingCanvas.width, this.editingCanvas.height);

      const maskChangeOperation: MaskChangeOperation = {
        polygon: newMask,
        drawingMode: this.params.drawingMode,
        delta: deltaNeto,
      } as MaskChangeOperation;

      this.$emit('mask', maskChangeOperation);
    },
    applyMaskToCanvas(mask: Polygon | undefined) {
      if (mask) {
        const shrinked = Polygon.scale(mask, 1.0 / this.maskShrinkFactor);
        clipCanvas(this.$refs.maskCanvas, shrinked.svg, this.artefact.color);
      } else {
        const ctx = this.maskCanvas.getContext('2d');
        if (ctx === null) {
          throw new Error('Received null mask canvas context');
        }
        ctx.clearRect(0, 0, this.maskCanvas.width, this.maskCanvas.height);
      }
    },
  },
  watch: {
    width(to, from) {
      if (to && from !== to) {
        this.editingCanvas.width = to;
      }
    },
    height(to, from) {
      if (to && from !== to) {
        this.editingCanvas.height = to;
      }
    },
    clippingMask(to: Polygon | undefined, from: Polygon | undefined) {
      this.applyMaskToCanvas(to);
    },
  },
  mounted() {
    // Set the initial size of the editingCanvas
    this.editingCanvas.width = this.width;
    this.editingCanvas.height = this.height;

    let ctx = this.maskCanvas.getContext('2d');
    if (ctx === null) {
      throw new Error("Can't get context for maskCanvas");
    }
    this.maskCanvasContext = ctx;

    ctx = this.editingCanvas.getContext('2d');
    if (ctx === null) {
      throw new Error("Can't get context for editingCanvas");
    }
    this.editingCanvasContext = ctx;

    this.applyMaskToCanvas(this.clippingMask);
  }
});
</script>

<style lang="scss" scoped>
.artefactOverlay {
  cursor: crosshair;
}

.maskCanvas {
  opacity: 0.3;
  touch-action: pinch-zoom;
}

.maskCanvas.pulse {
  visibility: visible;
  opacity: 0.3;
  animation: pulsate 3s ease-out;
  animation-iteration-count: infinite;
}

.maskCanvas.hidden {
  opacity: 0;
}

@keyframes pulsate {
  0% {
    opacity: 0;
  }
  50% {
    opacity: 0.3;
  }
  100% {
    opacity: 0;
  }
}
</style>
