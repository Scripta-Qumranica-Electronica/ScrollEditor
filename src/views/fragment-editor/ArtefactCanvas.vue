<template>
  <div 
    ref="artefactOverlay"
    class="artefactOverlay"
    id="artefactOverlay"
    :class="{ editable: editable} "
    :width="width"
    :height="height"
    style="top: 0px; left: 0px;"
    :style="{transform: `scale(${scale})`}"
    v-shortcuts="[
    { shortcut: [ '+' ], callback: zoomIn },
    { shortcut: [ '-' ], callback: zoomOut },
    ]">
    <div :style="{transform: `rotate(${params.rotationAngle}deg`}">
      <canvas
        class="maskCanvas"
        :class="{hidden: clip, pulse: !drawing}"
        ref="maskCanvas"
        :width="width"
        :height="height"
        @mousemove="trackMouse($event)"
        @mouseenter="mouseOver = editable"
        @mouseleave="mouseOver = false"
        @mousedown="processMouseDown"
        @mouseup="processMouseUp"
        v-touch:tap="mouseOver = editable"
        v-touch:longtap="longtapHandler"
        v-touch:swipe.left="processMouseDown"
        v-touch:swipe.right="swipeRight"
        v-touch:doubletap="onDoubleTap">-->
      </canvas>
        
      <div v-if="editable"
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
import { EditorParams, DrawingMode, MaskChangedEventArgs, Position } from './types';
import { Fragment } from '@/models/fragment';
import { Artefact } from '@/models/artefact';
import { Polygon } from '@/utils/Polygons';

// interface Position {
//   x: number;
//   y: number;
// }

export default Vue.extend({
  props: {
    params: EditorParams,
    fragment: Fragment,
    clippingMask: Polygon,
    editable: Boolean,
    width: Number,
    height: Number,
    divisor: Number,
  },
  data() {
    return {
      cursorPos: {
        x: 10,
        y: 10,
      } as Position,
      mouseOver: false,
      drawing: false,
      editingCanvas: document.createElement('canvas'),
      currentClipperPolygon: [[]],
      cursorTransform: Matrix.unit(),
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
    }
  },
  methods: {
    trackMouse(event: MouseEvent) {
      /* if (!this.editable) {
        return;
      } */
      // Cursor position should 
      this.cursorPos = this.mousePositionInElement(event, event.target as HTMLElement);
      if (this.drawing) {
        this.drawOnCanvas();
      }
    },
    swipeRight() {
      debugger
      this.processMouseDown();
    },
    processMouseDown() {
      if (!this.editable) {
        return;
      }

      this.drawing = true;
      this.drawOnCanvas();
    },
    async processMouseUp() {
      this.drawing = false;

      if (!this.editable) {
        return;
      }

      await this.recalculateMask();
    },
    tapHandler() {
      console.log("tapHandler*****************");
    },
    longtapHandler() {
      console.log("longtapHandler");
    },
    swipeLeftHandler() {
      console.log("swipeLeftHandler");
    },
    swipeRightHandler() {
      console.log("swipeRightHandler");
    },
    onDoubleTap() {
      console.log("-----onDoubleTap");
    },
    drawOnCanvas() {
      if (this.editable) {
        const ctx = this.maskCanvas.getContext('2d');
        if (ctx === null) {
          throw new Error('Got null canvas context');
        }
        ctx.beginPath();
        ctx.arc(
          this.cursorPos.x / this.scale,
          this.cursorPos.y / this.scale,
          this.params.brushSize / 2 / this.scale,
          0,
          2 * Math.PI
        );
        ctx.closePath();

        const editingCTX = this.editingCanvas.getContext('2d');
        if (editingCTX === null) {
          throw new Error('Got null editing canvas context');
        }
        editingCTX.beginPath();
        editingCTX.arc(
          this.cursorPos.x / this.scale,
          this.cursorPos.y / this.scale,
          this.params.brushSize / 2 / this.scale,
          0,
          2 * Math.PI
        );
        editingCTX.closePath();

        if (this.params.drawingMode === DrawingMode.ERASE) {
          ctx.globalCompositeOperation = 'destination-out';
          ctx.fill();

          editingCTX.globalCompositeOperation = 'source-over';
          editingCTX.fillStyle = 'purple';
          editingCTX.fill();
        } else {
          ctx.globalCompositeOperation = 'source-over';
          ctx.fillStyle = 'purple';
          ctx.fill();

          editingCTX.globalCompositeOperation = 'source-over';
          editingCTX.fillStyle = 'purple';
          editingCTX.fill();
        }
      }
    },
    mousePositionInElement(event: MouseEvent, element: HTMLElement) {
      // The fragment editor only supports rotation by 90 degree increments.

      const initOffset = element.getBoundingClientRect();
      const rawPos = {
        x: event.clientX - initOffset.left + element.scrollLeft,
        y: event.clientY - initOffset.top + element.scrollTop,
      } as Position;

      const angle = ((this.rotationAngle % 360) + 360) % 360 // https://stackoverflow.com/a/4467559/871910 - handle negative numbers
      let rotatedPos = { ... rawPos };
      if (angle === 180) {
        rotatedPos = {
          x: this.width * this.scale - rawPos.x,
          y: this.height * this.scale - rawPos.y,
        }
      } else if (angle === 90) {
        rotatedPos = {
          x: rawPos.y,
          y: this.width * this.scale - rawPos.x,
        }
      } else if (angle === 270) {
        rotatedPos = {
          x: this.height * this.scale - rawPos.y,
          y: rawPos.x,
        }
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

      let maskChangedEventArgs: MaskChangedEventArgs = {} as MaskChangedEventArgs;
      maskChangedEventArgs.polygon = newMask;
      maskChangedEventArgs.drawingMode = this.params.drawingMode;
      maskChangedEventArgs.delta = deltaNeto;

      this.$emit('mask', maskChangedEventArgs);
    },
    applyMaskToCanvas(mask: Polygon | undefined) {
      if (mask) {
        clipCanvas(this.$refs.maskCanvas, mask.svg, this.divisor);
      } else {
        const ctx = this.maskCanvas.getContext('2d');
        if (ctx === null) {
          throw new Error('Received null mask canvas context');
        }
        ctx.clearRect(0, 0, this.maskCanvas.width, this.maskCanvas.height);
      }
    },
    zoomIn() {
      if (this.params.zoom < 1) {
        const oldZoom = this.params.zoom;
        this.params.zoom += 0.02;
        this.$emit('zoom', {mouseX: this.cursorPos.x, mouseY: this.cursorPos.y, oldZoom});
      }
    },
    zoomOut() {
      if (this.params.zoom > 0.1) {
        const oldZoom = this.params.zoom;
        this.params.zoom -= 0.02;
        this.$emit('zoom', {mouseX: this.cursorPos.x, mouseY: this.cursorPos.y, oldZoom});
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
.artefactOverlay.editable {
  cursor: none;
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
