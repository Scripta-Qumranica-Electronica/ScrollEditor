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

<script>
import { trace } from '~/utils/Potrace.js'
import {
  clipCanvas,
  wktPolygonToSvg,
  svgPolygonToGeoJSON,
  svgPolygonToClipper,
  clipperToSVGPolygon,
} from '~/utils/VectorFactory'
import ClipperLib from 'js-clipper/clipper'

export default {
  props: {
    mask: undefined,
    width: 0,
    height: 0,
    divisor: 0,
    scale: 0,
    drawMode: '',
    brushSize: 0,
    locked: true,
    clip: false,
  },
  data() {
    return {
      cursorPos: {
        x: 10,
        y: 10,
      },
      mouseOver: false,
      drawing: false,
      editingCanvas: document.createElement('canvas'),
      currentClipperPolygon: [[]],
    }
  },
  methods: {
    trackMouse(event) {
      this.cursorPos = this.mousePositionInElement(event, event.target)
      if (this.drawing) {
        this.drawOnCanvas()
      }
    },
    processMouseDown() {
      this.drawing = true
      this.drawOnCanvas()
    },
    processMouseUp() {
      this.drawing = false
      this.canvasToSVG()
    },
    drawOnCanvas() {
      if (!this.locked) {
        const ctx = this.$refs.maskCanvas.getContext('2d')
        ctx.beginPath()
        ctx.arc(
          this.cursorPos.x / this.scale,
          this.cursorPos.y / this.scale,
          this.brushSize / 2 / this.scale,
          0,
          2 * Math.PI
        )
        ctx.closePath()

        const editingCTX = this.editingCanvas.getContext('2d')
        editingCTX.beginPath()
        editingCTX.arc(
          this.cursorPos.x / this.scale,
          this.cursorPos.y / this.scale,
          this.brushSize / 2 / this.scale,
          0,
          2 * Math.PI
        )
        editingCTX.closePath()

        if (this.drawMode === 'erase') {
          ctx.globalCompositeOperation = 'destination-out'
          ctx.fill()

          editingCTX.globalCompositeOperation = 'source-over'
          editingCTX.fillStyle = 'purple'
          editingCTX.fill()
        } else {
          ctx.globalCompositeOperation = 'source-over'
          ctx.fillStyle = 'purple'
          ctx.fill()

          editingCTX.globalCompositeOperation = 'source-over'
          editingCTX.fillStyle = 'purple'
          editingCTX.fill()
        }
      }
    },
    mousePositionInElement(event, element) {
      const initOffset = element.getBoundingClientRect()
      let returnPos = {
        x: event.clientX - initOffset.left + element.scrollLeft,
        y: event.clientY - initOffset.top + element.scrollTop,
      }
      return returnPos
    },
    canvasToSVG() {
      trace(this.editingCanvas, this.divisor).then(res => {
        const newClipperPolygon = svgPolygonToClipper(res)
        let cpr = new ClipperLib.Clipper()
        cpr.AddPaths(this.currentClipperPolygon, ClipperLib.PolyType.ptSubject, true)
        cpr.AddPaths(newClipperPolygon, ClipperLib.PolyType.ptClip, true)
        let solution_paths = new ClipperLib.Paths()
        if (this.drawMode === 'erase') {
          let succeeded = cpr.Execute(
            ClipperLib.ClipType.ctDifference,
            solution_paths,
            ClipperLib.PolyFillType.pftNonZero,
            ClipperLib.PolyFillType.pftNonZero
          )
        } else {
          let succeeded = cpr.Execute(
            ClipperLib.ClipType.ctUnion,
            solution_paths,
            ClipperLib.PolyFillType.pftNonZero,
            ClipperLib.PolyFillType.pftNonZero
          )
        }
        let ctx = this.editingCanvas.getContext('2d')
        ctx.clearRect(0, 0, this.editingCanvas.width, this.editingCanvas.height)
        this.$emit('mask', clipperToSVGPolygon(solution_paths))
      })
    },
  },
  watch: {
    mask(to, from) {
      if (to && from !== to) {
        const svgMask = wktPolygonToSvg(to)
        clipCanvas(this.$refs.maskCanvas, svgMask, this.divisor)
        this.currentClipperPolygon = svgPolygonToClipper(svgMask)
      } else {
        let ctx = this.$refs.maskCanvas.getContext('2d')
        ctx.clearRect(0, 0, this.$refs.maskCanvas.width, this.$refs.maskCanvas.height)
      }
    },
    width(to, from) {
      if (to && from !== to) {
        this.editingCanvas.width = to
      }
    },
    height(to, from) {
      if (to && from !== to) {
        this.editingCanvas.height = to
      }
    },
  },
}
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
