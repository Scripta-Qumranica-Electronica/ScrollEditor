<template>
  <div :width="actualWidth" :height="actualHeight">
    <canvas
      class="signCanvas"
      :width="actualWidth"
      :height="actualHeight"
      ref="signCanvas"
      @pointermove="pointerMove($event)"
      @pointerdown="pointerDown($event)"
      @pointerup="pointerUp($event)"
    ></canvas>
    <!--:width="actualWidth"
    :height="actualHeight"-->
  </div>
</template>


<script lang="ts">
import Vue from 'vue';
import { ArtefactEditorParams, DrawingShapesMode } from './types';
import { ShapeSign } from './types';
import { Polygon } from '@/utils/Polygons';
import {
  PointerTracker,
  PointerTrackingEvent,
  Position
} from '@/utils/PointerTracker';
import { EditMode } from '@/views/imaged-object-editor/types';

// tslint:disable:no-var-requires
const trace = require('@/utils/Potrace.js').trace;
// tslint:enable:no-var-requires
export default Vue.extend({
  name: 'sign-canvas',
  data() {
    return {
      firstPointLeftCornerPosition: 0,
      firstPointTopCornerPosition: 0,
      cursorPos: {} as Position,
      // zooming: false,
      lastCursorPos: {} as Position,
      pointerTracker: new PointerTracker(),
      editMode: EditMode.NONE,
      signCanvasContext: {} as CanvasRenderingContext2D,
    //   currentSignPolygon: {} as Polygon,
      rectangle: 0,
      // shapeSign: {} as ShapeSign,
    };
  },
  props: {
    params: ArtefactEditorParams,
    originalImageWidth: Number,
    originalImageHeight: Number,
    shapeSign: {
      type: Object as () => ShapeSign
    },
    scale: Number
  },
  watch: {
    shapeSign(to: ShapeSign | undefined, from: ShapeSign | undefined) {
        this.clearCanvas();
    },
  },
  computed: {
    rotationAngle(): number {
      return this.params.rotationAngle;
    },
    actualWidth(): number {
      return (
        this.originalImageWidth /
        this.scale /
        this.$render.scalingFactors.canvas
      );
    },
    actualHeight(): number {
      return (
        this.originalImageHeight /
        this.scale /
        this.$render.scalingFactors.canvas
      );
    },
    zoom(): number {
      return this.params.zoom;
    },
    brushSize(): number {
      return this.params.brushSize;
    },
    signCanvas(): HTMLCanvasElement {
      return this.$refs.signCanvas as HTMLCanvasElement;
    }
  },
  mounted() {
    const ctx = this.signCanvas.getContext('2d');
    if (ctx === null) {
      throw new Error("Can't get context for signCanvas");
    }
    this.signCanvasContext = ctx;
    this.clearCanvas();
  },
  methods: {
    clearCanvas() {
      this.signCanvasContext.clearRect(
          0,
          0,
          this.signCanvas.width,
          this.signCanvas.height
        );
    },
    drawPoint(pos: Position) {
      this.signCanvasContext.beginPath();
      this.signCanvasContext.arc(
        pos.x,
        pos.y,
        this.brushSize / 2 / this.zoom / this.$render.scalingFactors.combined,
        0,
        Math.PI * 2
      );
      this.signCanvasContext.fill();
      this.signCanvasContext.closePath();
    },
    pointerDown(event: PointerEvent) {
      if (this.shapeSign.polygon.svg !== '') {
        // this.clearCanvas();
        return;
      }
      if (this.shapeSign.shape === DrawingShapesMode.RECTANGLE) {
        this.editMode = EditMode.DRAWING;
        this.signCanvasContext.globalCompositeOperation = 'source-over';
        this.drawRectangle(event);
        return;
      }
      if (event.ctrlKey || event.button !== 0) {
        return;
      }

      const exEvent = this.extendEvent(event);
      this.pointerTracker.handleEvent(exEvent);

      const count = this.pointerTracker.count;
      if (count === 2) {
        this.abortDrawing();

        this.editMode = EditMode.ADJUSTING;
      } else if (count > 2) {
        this.editMode = EditMode.NONE;
      } else if (count === 1) {
        this.lastCursorPos = exEvent.logicalPosition;

        // Initialize the canvases
        this.editMode = EditMode.DRAWING;
        this.signCanvasContext.globalCompositeOperation = 'source-over';

        const polygonColor = 'blue';
        this.signCanvasContext.strokeStyle = polygonColor;
        this.signCanvasContext.fillStyle = polygonColor;
      }
    },
    extendEvent(event: PointerEvent) {
      const normalized = this.normalizePosition(event);
      //   const rotated = this.applyRotation(normalized);

      const extended = new PointerTrackingEvent(event, normalized); // rotated
      return extended;
    },
    normalizePosition(event: PointerEvent) {
      // Take the pointer event and return the position inside the image, in canvas coordinates units
      // (right, bottom) is (actualWidth, actualHeight)

      const element = event.target as HTMLElement;
      const initOffset = element.getBoundingClientRect();

      // Position in pixels, compared to top left corner of the canvas
      // Note: element.scrollLeft and scrollTop are probably always 0, but it doesn't hurt to add them
      const rawPos = {
        x: event.clientX - initOffset.left + element.scrollLeft,
        y: event.clientY - initOffset.top + element.scrollTop
      } as Position;

      // Take into account scaling to get to the canvas coordiantes
      const scaledPos = {
        x: rawPos.x / this.zoom,
        y: rawPos.y / this.zoom
      };

      return scaledPos;
    },
    drawLine(start: Position, end: Position) {
      this.signCanvasContext.beginPath();
      this.signCanvasContext.lineWidth =
        this.brushSize / this.zoom / this.$render.scalingFactors.combined;
      this.signCanvasContext.moveTo(start.x, start.y);
      this.signCanvasContext.lineTo(end.x, end.y);
      this.signCanvasContext.stroke();
      this.signCanvasContext.closePath();
    },
    pointerMove(event: PointerEvent) {
      if (this.shapeSign.shape === DrawingShapesMode.RECTANGLE) {
        return;
      }
      // this.zooming = event.ctrlKey;

      const exEvent = this.extendEvent(event);
      this.pointerTracker.handleEvent(exEvent);

      if (this.editMode === EditMode.DRAWING) {
        this.drawing();
      }
    },
    async pointerUp(event: PointerEvent) {
      if (this.shapeSign.shape === DrawingShapesMode.RECTANGLE) {
        return;
      }

      const exEvent = this.extendEvent(event);
      this.pointerTracker.handleEvent(exEvent);

      if (this.editMode === EditMode.DRAWING) {
        this.drawPoint(this.lastCursorPos);
        await this.recalculateMask();
      }

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
    async recalculateMask() {
      const canvas = this.signCanvas;
      const canvasSvg: any = await trace(canvas, 1);
      const canvasPolygon = Polygon.fromSvg(canvasSvg);
      this.shapeSign.polygon = canvasPolygon;
    //   this.currentSignPolygon = canvasPolygon;
      this.$emit('SignChanged', canvasPolygon);
    },
    abortDrawing() {
      // this.clearCanvas();
    },
    async drawRectangle(event: PointerEvent) {
      const exEvent = this.extendEvent(event);
      // this.pointerTracker.handleEvent(exEvent);

      if (this.rectangle === 0) {
        this.firstPointLeftCornerPosition =
          exEvent.logicalPosition.x - this.signCanvas.offsetLeft;
        this.firstPointTopCornerPosition =
          exEvent.logicalPosition.y - this.signCanvas.offsetTop;

        this.drawPoint({
            x: this.firstPointLeftCornerPosition,
            y: this.firstPointTopCornerPosition
        } as Position);
        this.signCanvasContext.moveTo(
          this.firstPointLeftCornerPosition,
          this.firstPointTopCornerPosition
        );
        this.rectangle++;
      } else {
        const secondPointLeftCornerPosition =
          exEvent.logicalPosition.x - this.signCanvas.offsetLeft;
        const secondPointTopCornerPosition =
          exEvent.logicalPosition.y - this.signCanvas.offsetTop;
        this.signCanvasContext.beginPath();
        this.signCanvasContext.moveTo(
          secondPointLeftCornerPosition,
          secondPointTopCornerPosition
        );

        this.signCanvasContext.lineWidth =
          this.brushSize / 2 / this.zoom / this.$render.scalingFactors.combined;

        // Clear the first point
        this.signCanvasContext.clearRect(
            0, 0,
            this.signCanvas.width,
            this.signCanvas.height
        );
        this.signCanvasContext.strokeRect(
          this.firstPointLeftCornerPosition,
          this.firstPointTopCornerPosition,
          secondPointLeftCornerPosition - this.firstPointLeftCornerPosition,
          secondPointTopCornerPosition - this.firstPointTopCornerPosition
        );
        this.signCanvasContext.stroke();
        this.rectangle = 0;

        await this.recalculateMask();
      }
    }
  }
  // state.signMap.set(sign, polygon);
});
</script>


<style lang="scss" scoped>
  .signCanvas {
    touch-action: pinch-zoom;
  }
</style>
