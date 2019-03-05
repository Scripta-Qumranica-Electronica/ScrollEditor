<template>
  <div 
  class="artefactOverlay"
    :class="{ editable: true}"    
    :style="{transform: `scale(${scale})`}">
    <div>
      <canvas
        id="maskCanvas"
        class="maskCanvas"
        ref="maskCanvas"
        width=8000
        height=8000
        style="position: absolute; top: 0; left:0;"
        @pointermove="trackMouse($event)"
        @pointerdown="processMouseDown"
        @pointerup="processMouseUp"
      >
      </canvas>
        
      <div
        class="cursor" 
        :style="{
          top: `-${brushSize / 2 / scale}px`, 
          left: `-${brushSize / 2 / scale}px`,
          transform: `translate3d(${cursorPos.x / scale}px,${cursorPos.y / scale}px,0px)`
        }">
        
        <svg
          :width="brushSize / scale" 
          :height="brushSize / scale">
     
     <!--
            <circle 
            class="cursor-img" 
            :cx="brushSize / scale / 2"
            :cy="brushSize / scale / 2"
            :r="brushSize / scale / 2"
            stroke="black"
            stroke-width="1"
            fill="red">
          </circle>
       -->
          <rect 
            class="cursor-img" 
            :width="brushSize / scale"
            :height="brushSize / scale"
            stroke="black"
            stroke-width="1"
            fill="red">
          </rect>
        </svg>
      </div>
    </div>
  </div>
</template>


<script lang="ts">
import Vue from 'vue';
import { Position } from './fragment-editor/types';


export default Vue.extend({
  data() {
    return {
      cursorPos: {
        x: 10,
        y: 10,
      } as Position,
      oldPos: {} as Position,
      mouseClientPosition: {} as Position,
    //   drawing: false,
    };
  },
  computed: {
    maskCanvas(): HTMLCanvasElement {
      return this.$refs.maskCanvas as HTMLCanvasElement;
    },
     scale(): number {
      return 0.1;
    },
    brushSize(): number {
      return 20;
    },
  }, 
  methods: {
    trackMouse(event: TouchEvent) {
    //   console.log('tarck mouse', event)
    //   this.zooming = event.ctrlKey;

      this.mouseClientPosition.x = event.clientX;
      this.mouseClientPosition.y = event.clientY;

     
      // Cursor position should
      this.oldPos.x = this.cursorPos.x;
      this.oldPos.y = this.cursorPos.y;
      this.cursorPos = this.mousePositionInElement(event, event.target as HTMLElement);
    //   if (this.drawing) {
        this.drawOnCanvas();
    //   }
    },
    processMouseDown(event: MouseEvent) {
        console.log('down');
      if (event.ctrlKey || event.button !== 0) {
        return;
      }
    //   this.drawing = true;
      this.drawOnCanvas();
    },
    processMouseUp(event: MouseEvent) {
        console.log('up');
      if (event.button !== 0) {
        return;
      }

    //   this.drawing = false;
    },
   
   drawOnCanvas() {
    //    debugger
    console.log('draw on canvas')
 
      const ctx = this.maskCanvas.getContext('2d');
      if (ctx === null) {
        throw new Error('Got null canvas context');
      }

      const length = this.brushSize / this.scale;
      ctx.beginPath();
      ctx.rect(
        this.cursorPos.x / this.scale - length / 2,
        this.cursorPos.y / this.scale - length / 2,
        length,
        length
        );

    //   ctx.arc(
    //     this.cursorPos.x / this.scale,
    //     this.cursorPos.y / this.scale,
    //     this.brushSize  / this.scale,
    //     0,
    //     2 * Math.PI
    //   );
    /*
    if (this.lastPosition.x) {
        ctx.lineWidth=20;
        ctx.strokeStyle='black';
        // debugger
        ctx.moveTo(this.lastPosition.x, this.lastPosition.y);
        ctx.lineTo(this.mouseClientPosition.x, this.mouseClientPosition.y);
        console.log('lastPosition=', this.lastPosition.x, this.lastPosition.y)
        console.log('mouseClientPosition=', this.mouseClientPosition.x, this.mouseClientPosition.y)
        console.log('cursorPos=', this.cursorPos.x, this.cursorPos.y)
        
      }*/
     if (this.oldPos.x) {
        ctx.lineWidth = this.brushSize * this.brushSize;
        ctx.strokeStyle='red';
        ctx.moveTo(this.oldPos.x / this.scale - length / 2, this.oldPos.y / this.scale - length / 2);
        ctx.lineTo(this.cursorPos.x / this.scale - length / 2, this.cursorPos.y / this.scale - length / 2);
      }
     

      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'yellow';
      ctx.fill();
      ctx.stroke();
      ctx.closePath();
    },
  
   mousePositionInElement(event: MouseEvent, element: HTMLElement) {
      // The fragment editor only supports rotation by 90 degree increments.

      const initOffset = element.getBoundingClientRect();
      const rawPos = {
        x: event.clientX - initOffset.left + element.scrollLeft,
        y: event.clientY - initOffset.top + element.scrollTop,
      } as Position;

      let rotatedPos = { ... rawPos };
      return rotatedPos;
    },
  }
});
</script>
<style lang="scss" scoped>
.artefactOverlay {
//   touch-action: pinch-zoom;
}
</style>