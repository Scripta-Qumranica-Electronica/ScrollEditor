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
    @wheel="mouseWheel"
    v-shortcuts="[
    { shortcut: [ '+' ], callback: zoomIn },
    { shortcut: [ '-' ], callback: zoomOut },
    ]">
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
      @mouseup="processMouseUp">
     <!-- v-touch:tap="tapHandler"
      v-touch:longtap="longtapHandler"
      v-touch:swipe.left="swipeLeftHandler"
      v-touch:swipe.right="swipeRightHandler"
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
</template>

<script lang="ts">
import Vue from 'vue';

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
import { EditorParams, DrawingMode, MaskChangedEventArgs, Point } from './types';
import { Fragment } from '@/models/fragment';
import { Artefact } from '@/models/artefact';
import { Polygon } from '@/utils/Polygons';

interface Position {
  x: number;
  y: number;
}

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
    }
  },
  methods: {
    trackMouse(event: MouseEvent) {
      if (!this.editable) {
        return;
      }
      this.cursorPos = this.mousePositionInElement(event, event.target as HTMLElement);
      if (this.drawing) {
        this.drawOnCanvas();
      }
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
      const initOffset = element.getBoundingClientRect();
      const returnPos = {
        x: event.clientX - initOffset.left + element.scrollLeft,
        y: event.clientY - initOffset.top + element.scrollTop,
      } as Position;
      return returnPos;
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
    /*
When catching the event, get the viewport's top-left corner X and Y coordinates, and udpate them as such:

(Xold, Yold) are the X,Y coordinates of the mouse cursor on the artefact canvas.

Xnew = Xold * zoom-new / zoom-old
Ynew = Yold * zoom-new / zoom-old

X-CornerNew = Max(X-CornerOld + Xnew - Xold, 0)
Y-CornerNew = Max(Y-CornerOld + Ynew - Yold, 0)

Change the scroll bars so that (X-CornerNew, Y-CornerNew) is the top-left corner of the viewport*/

    mouseWheel(event: any) {
      const oldZoom = this.params.zoom;
      if (event.deltaY > 0) {
        this.zoomOut();
      } else {
        this.zoomIn();
      }
      const newZoom = this.params.zoom;
      console.log("zoom old=", oldZoom, "newZoom", newZoom)

      var artefact = document.querySelector('#artefactOverlay');
      const artefactRect = artefact!.getBoundingClientRect();
      let cornerPoint = new Point(artefactRect);
      
      let mousePoint = new Point({x: event.pageX, y: event.pageY});
      console.log("pointCorner", cornerPoint);
      console.log("mousePoint", mousePoint);

      let newPoint = {} as Point;
      newPoint.x = mousePoint.x * newZoom / oldZoom
      newPoint.y = mousePoint.y * newZoom / oldZoom

      let newCornerPoint = {} as Point;
      newCornerPoint.x = Math.abs(cornerPoint.x + newPoint.x - mousePoint.x); // Why max ?
      newCornerPoint.y = Math.abs(cornerPoint.y + newPoint.y - mousePoint.y);
      console.log("**********************************newCornerPoint", newCornerPoint);
      if(!newCornerPoint.x || !newCornerPoint.y) {
        debugger
      }

      artefact!.style.top = newCornerPoint.x + "px";
      artefact!.style.left = newCornerPoint.y + "px";
      debugger

      // TODO: Change the scroll bars so that (X-CornerNew, Y-CornerNew) is the top-left corner of the viewport
    },
    zoomIn() {
      if (this.params.zoom < 1) {
        this.params.zoom += 0.02;
      }
    },
    zoomOut() {
      if (this.params.zoom > 0.1) {
        this.params.zoom -= 0.02;
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
