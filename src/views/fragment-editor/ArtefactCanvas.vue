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
        @pointermove="trackMouse($event)"
        @mouseenter="mouseOver = editable"
        @mouseleave="mouseOver = false"
        @pointerdown="processMouseDown"
        @pointerup="processMouseUp"
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
      <!--      <rect 
            class="cursor-img" 
            :width="brushSize / scale"
            :height="brushSize / scale"
            stroke="black"
            stroke-width="1"
            :fill="cursorColor">
          </rect>
             -->
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
      cursorPos: {
        x: undefined,
        y: undefined,
      } as Position,
      oldPos: {} as Position,
      mouseClientPosition: {} as Position,
      mouseOver: false,
      drawing: false,
      editingCanvas: document.createElement('canvas'),
      currentClipperPolygon: [[]],
      cursorTransform: Matrix.unit(),
      zooming: false,
      multiFinger: false,
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
    trackMouse(event: PointerEvent) {
      // console.log('tarck mouse', event)
      if (!this.selected || this.multiFinger) {
        return;
      }
      this.zooming = event.ctrlKey;

      this.mouseClientPosition.x = event.clientX;
      this.mouseClientPosition.y = event.clientY;

      /* if (!this.editable) {
        return;
      } */
      // Cursor position should
      // *** console.log('oldPos = cursorPos');
      // this.oldPos.x = this.cursorPos.x; //uncomment it - line between points
      // this.oldPos.y = this.cursorPos.y;
      this.cursorPos = this.mousePositionInElement(event, event.target as HTMLElement);
      if (this.drawing) {
        this.drawOnCanvas();
      }
    },
    processMouseDown(event: PointerEvent) {
      // clearTimeout(this.timeFlag);
      if (!this.selected) {
        return;
      }
      if (!this.editable) {
        return;
      }
      if (event.ctrlKey || event.button !== 0) {
        return;
      }
      this.drawing = true;
      this.drawOnCanvas();
    },
    async processMouseUp(event: PointerEvent) {
      console.log("mouse up")
      // *** console.log('up, --oldPos=undefined')
      this.oldPos.x = undefined;
      this.oldPos.y = undefined;  
      if (!this.selected) {
        return;
      }
      if (event.button !== 0) {
        return;
      }

      this.drawing = false;

      if (!this.editable) {
        return;
      }

      
      await this.recalculateMask();
      // var self = this;
      // this.timeFlag = setTimeout(async function() {await self.recalculateMask()}, 200);      
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
    // onTouchStart(event: TouchEvent) {
    //   event.preventDefault();
    //   // console.log(event)
    //   if (event.touches.length > 1) {
    //     this.multiFinger = true;
    //   } else {
    //     this.multiFinger = false;
    //   }
    //   if (event.touches.length === 2) { // two fingers touch
    //     console.log('two fingers event', event);
    //     const deltaY = event.touches[0].pageY - event.touches[1].pageY;
    //     this.zoomLocation(deltaY);
    //   }
    // },
    // onTouchMove(event :TouchEvent) {
    //   // event.preventDefault();
    //   const touch = event.touches[0];
    //   if (document.elementFromPoint(touch.pageX,touch.pageY).id === 'maskCanvas') {
    //     this.touchleave();
    //   }
    // },
    // touchleave() {
    //   this.mouseOver = false;
    // },
   drawOnCanvas() {
      if (!this.editable) {
        return;
      }
      const ctx = this.maskCanvas.getContext('2d');
      if (ctx === null) {
        throw new Error('Got null canvas context');
      }
      const length = this.params.brushSize / this.scale;
      ctx.beginPath();
      // ctx.rect(
      //   this.cursorPos.x / this.scale - length / 2,
      //   this.cursorPos.y / this.scale - length / 2,
      //   length,
      //   length
      //   );
      ctx.arc(
        this.cursorPos.x / this.scale,
        this.cursorPos.y / this.scale,
        this.params.brushSize/ 2 /this.scale, // /2
        0,
        2 * Math.PI
      );
      ctx.closePath();

      const editingCTX = this.editingCanvas.getContext('2d');
      if (editingCTX === null) {
        throw new Error('Got null editing canvas context');
      }
      editingCTX.beginPath();
      // editingCTX.rect(
      //   this.cursorPos.x / this.scale - length / 2,
      //   this.cursorPos.y / this.scale - length / 2,
      //   length,
      //   length
      // );
      editingCTX.arc(
        this.cursorPos.x / this.scale,
        this.cursorPos.y / this.scale,
        this.params.brushSize / 2 / this.scale,
        0,
        2 * Math.PI
      );
      editingCTX.closePath();
      // Draw line bwtween two move points
      if (this.oldPos.x) {
        // *** console.log('In draw line--', this.oldPos.x, ' , ', this.oldPos.y);
        
        ctx.lineWidth =  this.params.brushSize / this.scale;
        ctx.strokeStyle = this.artefact.color;
        ctx.moveTo(this.oldPos.x / this.scale - length / 2, this.oldPos.y / this.scale - length / 2);
        ctx.lineTo(this.cursorPos.x / this.scale - length / 2, this.cursorPos.y / this.scale - length / 2);

        ctx.stroke();
        // ctx.closePath();

        editingCTX.lineWidth =  this.params.brushSize / this.scale;
        editingCTX.strokeStyle = this.artefact.color;
        editingCTX.moveTo(this.oldPos.x / this.scale - length / 2, this.oldPos.y / this.scale - length / 2);
        editingCTX.lineTo(this.cursorPos.x / this.scale - length / 2, this.cursorPos.y / this.scale - length / 2);

        editingCTX.stroke();
        // editingCTX.closePath();
      }

      if (this.params.drawingMode === DrawingMode.ERASE) {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fill();

        editingCTX.globalCompositeOperation = 'source-over';
        editingCTX.fillStyle = this.artefact.color;
        editingCTX.fill();
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = this.artefact.color;
        ctx.fill();
  
        editingCTX.globalCompositeOperation = 'source-over';
        editingCTX.fillStyle = this.artefact.color;
        editingCTX.fill();
      }
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
  // touch-action: none;
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
