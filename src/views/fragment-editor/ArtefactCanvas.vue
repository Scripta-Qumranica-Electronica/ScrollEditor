<template>
  <div 
    ref="artefactOverlay"
    class="artefactOverlay"
    id="artefactOverlay"
    :class="{ editable: editable, zoom: zooming }"
    :width="width"
    :height="height"
    style="top: 0px; left: 0px;"
    :style="{transform: `scale(${scale})`}">
    <div :style="{transform: `rotate(${params.rotationAngle}deg`}">
      <canvas
        id="maskCanvas"
        class="maskCanvas"
        :class="{hidden: clip, pulse: !drawing && selected}"
        ref="maskCanvas"
        :width="width"
        :height="height"
        @mouseenter="mouseOver = editable"
        @mouseleave="mouseOver = false"
        @pointermove="pointerMove($event)"
        @pointerdown="pointerDown($event)"
        @pointerup="pointerUp"
        @wheel="onMouseWheel"
      > 
      </canvas>
        
      <div v-if="editable && !zooming"
        class="cursor" 
        v-show="mouseOver"
        :style="{
          top: `-${brushSize / 2 / scale}px`, 
          left: `-${brushSize / 2 / scale}px`,
          transform: `translate3d(${cursorPos.x / scale}px,${cursorPos.y / scale}px,0px)`
        }">
        
        <svg
          :width="brushSize / scale" 
          :height="brushSize / scale">
      
          <circle 
            class="cursor-img" 
            :cx="brushSize / scale / 2"
            :cy="brushSize / scale / 2"
            :r="brushSize / scale / 2"
            stroke="black"
            stroke-width="1"
            :fill="cursorColor">
          </circle>
       
        </svg>
      </div>
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
    divisor: Number,
  },
  data() {
    return {
      cursorPos: {} as Position,
      lastCursorPos: { } as Position,
      firstMoveOfDraw: false,
      mouseClientPosition: {} as Position,
      mouseOver: false,
      drawing: false,
      editingCanvas: document.createElement('canvas'),
      currentClipperPolygon: [[]],
      cursorTransform: Matrix.unit(),
      zooming: false,
    };
  },
  computed: {
    maskCanvas(): HTMLCanvasElement {
      return this.$refs.maskCanvas as HTMLCanvasElement;
    },
    scale(): number {
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
      return `rotate(${this.rotationAngle} ${this.width / this.divisor / 2} ${this.height / this.divisor / 2}`;
    },
    rotationAngle(): number {
      return this.params.rotationAngle;
    },
    clippingMask(): Polygon {
      return this.artefact.mask;
    },
  },
  methods: {
    async pointerUp() {
      if (!this.selected) {
        return;
      }
      if (event.button !== 0) {
        return;
      }

      if (this.drawing) {
        this.drawPoint(this.lastCursorPos);
      }
      this.drawing = false;
      
      if (!this.editable) {
        return;
      }

      await this.recalculateMask();
    },
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
      this.lastCursorPos = this.mousePositionInElement(event, event.target as HTMLElement);
      this.firstMoveOfDraw = true;
      this.drawing = true;
    },
    pointerMove(event: PointerEvent) {
      if (!this.selected) {
        return;
      }
      this.zooming = event.ctrlKey;

      if (!this.drawing) {
        return;
      }

      if (this.firstMoveOfDraw) {
        this.drawPoint(this.lastCursorPos);
        this.firstMoveOfDraw = false;
      }
      
      this.cursorPos = this.mousePositionInElement(event, event.target as HTMLElement);

      this.drawLine(this.lastCursorPos, this.cursorPos);
      this.lastCursorPos = this.cursorPos;
    },
    drawPoint(pos: Position) {
      const ctx = this.maskCanvas.getContext('2d');
      if (ctx===null) {
        console.warn('Received a null context');
        return;
      }

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, this.brushSize / 2, 0, Math.PI * 2);
      ctx.fillStyle = 'yellow';
      ctx.fill();
      ctx.closePath();
    },
    drawLine(start: Position, end: Position) {
      const ctx = this.maskCanvas.getContext('2d');
      if (ctx===null) {
        console.warn('Received a null context');
        return;
      }

      ctx.beginPath();
      ctx.lineWidth = this.brushSize;
      ctx.strokeStyle = 'yellow';
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
      ctx.closePath();
    },
    zoomLocation(deltaY) {
      this.zooming = true;
      event.preventDefault(); // Don't use the browser's zoom mechanism here, just ours
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
      this.zoomLocation(event.deltaY);
    },
    mousePositionInElement(event: PointerEvent, element: HTMLElement) {
      // The fragment editor only supports rotation by 90 degree increments.

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
      const canvasSvg: any = await trace(this.editingCanvas, this.divisor);
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
        clipCanvas(this.$refs.maskCanvas, mask.svg, this.divisor, this.artefact.color);
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

    this.applyMaskToCanvas(this.clippingMask);
  }
});
</script>

<style lang="scss" scoped>
.artefactOverlay {
  touch-action: none;
  &.editable {
    cursor: none;
  }
  &.zoom {
    cursor: crosshair !important;
  }
}

.maskCanvas {
  opacity: 0.3;
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
.cursor {
  position: absolute;
  opacity: 0.3;
  pointer-events: none;
}
</style>
