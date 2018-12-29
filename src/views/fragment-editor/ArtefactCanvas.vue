<template>
  <div 
    ref="artefactOverlay"
    class="artefactOverlay"
    :width="width"
    :height="height"
    :style="{transform: `scale(${scale})`}">
    <canvas
      class="maskCanvas"
      :class="{hidden: clip, pulse: !drawing}"
      ref="maskCanvas"
      :width="width"
      :height="height"
      @mousemove="trackMouse($event)"
      @mouseenter="mouseOver = locked ? false : true"
      @mouseleave="mouseOver = false"
      @mousedown="processMouseDown"
      @mouseup="processMouseUp">
    </canvas>
    <div 
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
          fill="blue">
        </circle>
      </svg>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import { trace } from '@/utils/Potrace.js';
import {
  clipCanvas,
  wktPolygonToSvg,
  svgPolygonToGeoJSON,
  svgPolygonToClipper,
  clipperToSVGPolygon,
} from '@/utils/VectorFactory';
import { EditorParams, DrawingMode } from './types';
import ClipperLib from 'js-clipper/clipper';
import { Fragment } from '@/models/fragment';
import { Artefact } from '@/models/artefact';

interface Position {
  x: number,
  y: number,
};

export default Vue.extend({
  props: {
    params: EditorParams,
    fragment: Fragment,
    artefact: Artefact,
    mask: String,
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
    locked(): boolean {
      return !this.$store.state.scroll.scrollVersion.permissions.canWrite;
    },
    maskCanvas(): HTMLCanvasElement {
      return this.$refs.maskCanvas as HTMLCanvasElement;
    },
    scale(): number {
      return this.params.zoom;
    },
  },
  methods: {
    trackMouse(event: MouseEvent) {
      this.cursorPos = this.mousePositionInElement(event, event.target as HTMLElement);
      if (this.drawing) {
        this.drawOnCanvas();
      }
    },
    processMouseDown() {
      this.drawing = true;
      this.drawOnCanvas();
    },
    processMouseUp() {
      this.drawing = false;
      this.canvasToSVG();
    },
    drawOnCanvas() {
      if (!this.locked) {
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
    canvasToSVG() {
      trace(this.editingCanvas, this.divisor).then((res) => {
        const newClipperPolygon = svgPolygonToClipper(res);
        const cpr = new ClipperLib.Clipper();
        cpr.AddPaths(this.currentClipperPolygon, ClipperLib.PolyType.ptSubject, true);
        cpr.AddPaths(newClipperPolygon, ClipperLib.PolyType.ptClip, true);
        const solution_paths = new ClipperLib.Paths();
        if (this.params.drawingMode === DrawingMode.ERASE) {
          const succeeded = cpr.Execute(
            ClipperLib.ClipType.ctDifference,
            solution_paths,
            ClipperLib.PolyFillType.pftNonZero,
            ClipperLib.PolyFillType.pftNonZero
          );
        } else {
         const succeeded = cpr.Execute(
            ClipperLib.ClipType.ctUnion,
            solution_paths,
            ClipperLib.PolyFillType.pftNonZero,
            ClipperLib.PolyFillType.pftNonZero
          );
        }
       const ctx = this.editingCanvas.getContext('2d');
        if (ctx === null) {
          throw new Error('Received null editing canvas context');
        }
        ctx.clearRect(0, 0, this.editingCanvas.width, this.editingCanvas.height);
        this.$emit('mask', clipperToSVGPolygon(solution_paths));
      });
    },
  },
  watch: {
    mask(to, from) {
      if (to && from !== to) {
        const svgMask = wktPolygonToSvg(to);
        clipCanvas(this.$refs.maskCanvas, svgMask, this.divisor);
        this.currentClipperPolygon = svgPolygonToClipper(svgMask);
      } else {
       const ctx = this.maskCanvas.getContext('2d');
        if (ctx === null) {
          throw new Error('Received null mask canvas context');
        }
        ctx.clearRect(0, 0, this.maskCanvas.width, this.maskCanvas.height);
      }
    },
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
  },
});
</script>

<style lang="scss" scoped>
.artefactOverlay {
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
