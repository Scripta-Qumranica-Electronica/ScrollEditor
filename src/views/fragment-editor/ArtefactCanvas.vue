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
        :class="{hidden: clip, pulse: !drawing && selected}"
        ref="maskCanvas"
        :width="width / maskShrinkFactor"
        :height="height / maskShrinkFactor"
        @pointermove="pointerMove($event)"
        @pointerdown="pointerDown($event)"
        @pointerup="pointerUp"
        @wheel="onMouseWheel"
      > 
      </canvas>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import { Matrix } from '@/utils/Matrices';

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
import { EditorParams, DrawingMode, MaskChangeOperation, Position, ZoomRequestEventArgs } from './types';
import { Fragment } from '@/models/fragment';
import { Artefact } from '@/models/artefact';
import { Polygon } from '@/utils/Polygons';

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
      drawing: false,
      editingCanvas: document.createElement('canvas'),
      currentClipperPolygon: [[]],
      cursorTransform: Matrix.unit(),
      zooming: false,
      maskShrinkFactor: 20,
      maskCanvasContext: { } as CanvasRenderingContext2D,
      editingCanvasContext: { } as CanvasRenderingContext2D,
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
  },
  methods: {
    pointerDown(event: PointerEvent) {
      if (!this.selected) {
        return;
      }
      if (!this.editable) {
        return;
      }
      if (event.ctrlKey || event.button !== 0) {
        return;
      }
      this.lastCursorPos = this.mousePositionInElement(event);

      // Initialize the canvases
      this.drawing = true;
      this.maskCanvasContext.globalCompositeOperation = this.params.drawingMode === DrawingMode.DRAW ? 'source-over' : 'destination-out';
      this.maskCanvasContext.fillStyle = this.artefact.color;
      this.maskCanvasContext.strokeStyle = this.artefact.color;

      this.editingCanvasContext.globalCompositeOperation = 'source-over';
      this.editingCanvasContext.fillStyle = this.artefact.color;
      this.editingCanvasContext.strokeStyle = this.artefact.color;
    },
    pointerMove(event: PointerEvent) {
      if (!this.selected) {
        return;
      }
      this.zooming = event.ctrlKey;

      if (!this.drawing) {
        return;
      }

      this.cursorPos = this.mousePositionInElement(event);
      this.drawPoint(this.lastCursorPos);
      this.drawLine(this.lastCursorPos, this.cursorPos);
      this.lastCursorPos = this.cursorPos;
    },
    async pointerUp() {
      if (!this.selected) {
        return;
      }
      // if (event.button !== 0) {
      //   return;
      // }

      if (this.drawing) {
        this.drawPoint(this.lastCursorPos);
      }
      this.drawing = false;

      if (!this.editable) {
        return;
      }

      await this.recalculateMask();
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
      this.editingCanvasContext.arc(pos.x / this.scale, pos.y / this.scale, this.brushSize / 2 / this.scale, 0, Math.PI * 2);
      this.editingCanvasContext.fill();
      this.editingCanvasContext.closePath();
    },
    drawLine(start: Position, end: Position) {
      this.maskCanvasContext.beginPath();
      this.maskCanvasContext.lineWidth = this.brushSize / this.scale / this.maskShrinkFactor;
      this.maskCanvasContext.moveTo(start.x / this.scale / this.maskShrinkFactor, start.y / this.scale / this.maskShrinkFactor);
      this.maskCanvasContext.lineTo(end.x / this.scale / this.maskShrinkFactor, end.y / this.scale / this.maskShrinkFactor);
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
    mousePositionInElement(event: MouseEvent) {
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

      return rotatedPos;
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
  touch-action: none;
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
