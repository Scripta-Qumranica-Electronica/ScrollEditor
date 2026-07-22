<template>
    <div id="scroll-map" ref="scrollMap">
        <svg
            v-if="ready"
            ref="svg"
            :width="actualWidth"
            :height="actualHeight"
            :viewBox="`${actualXOrigin} ${actualYOrigin} ${actualWidth} ${actualHeight}`"
            @click="onClick"
        >
            <g ref="group" :transform="transform">
                <rect
                    v-if="viewport"
                    :x="viewport.x"
                    :y="viewport.y"
                    :width="viewport.width"
                    :height="viewport.height"
                    vector-effect="non-scaling-stroke"
                />
                <artefact-sillhouette
                    :artefact="artefact"
                    v-for="artefact in placedArtefacts"
                    :key="artefact.id"
                />
            </g>
        </svg>
    </div>
</template>

<!-- <script src="https://unpkg.com/vue-toasted"></script>-->
<script lang="ts">
import { Component, Vue, Emit, Watch, toNative } from 'vue-facing-decorator';
import { Point } from '@/utils/helpers';
import ArtefactSillhouette from './artefact-sillhouette.vue';

@Component({
    name: 'scroll-map',
    components: {
        'artefact-sillhouette': ArtefactSillhouette
    }
})
class ScrollMap extends Vue {
    public width: number = 0;
    public ready = false;
    public observer?: ResizeObserver;
    public scaleFactor = 1;

    public created() {
        this.observer = new ResizeObserver(entities => this.onResize());
        this.ready = false;
    }

    public mounted() {
        this.observer!.observe(this.$refs.scrollMap as Element);
        this.onResize();
        this.ready = true;
    }

    public unmounted() {
        this.observer!.disconnect();
    }

    public get transform() {
        return `scale(${this.scaleFactor})`;
    }

    public get edition() {
        return this.$state.editions.current!;
    }

    @Watch('actualWidth')
    public setScaleFactor() {
        const div = this.$refs.scrollMap as Element;
        const width = div.clientWidth;

        this.scaleFactor = width / (this.edition.metrics.width * this.edition.ppm);
    }

    public onResize() {
        this.setScaleFactor();
    }

    public get viewport() {
        return this.$state.scrollEditor.viewport;
    }

    // Add a watch on `this.edition.metrics.width` - when it changes call setScaleFactor
    public get actualWidth() {
        return this.edition.metrics.width * this.edition.ppm * this.scaleFactor;
    }

    public get actualHeight() {
        return (
            this.edition.metrics.height * this.edition.ppm * this.scaleFactor
        );
    }

    public get totalWidth() {
        return this.edition.metrics.width * this.edition.ppm;
    }

    public get totalHeight() {
        return this.edition.metrics.height * this.edition.ppm;
    }

    public get actualXOrigin() {
        return (
            this.edition.metrics.xOrigin * this.edition.ppm * this.scaleFactor
        );
    }

    public get actualYOrigin() {
        return (
            this.edition.metrics.yOrigin * this.edition.ppm * this.scaleFactor
        );
    }

    public get placedArtefacts() {
        const artefacts = this.$state.artefacts.items;
        return artefacts
            .filter(x => x.isPlaced)
            .sort((a, b) => (a.placement.zIndex > b.placement.zIndex ? 1 : -1));
    }

    public onClick(ev: MouseEvent) {
        const pt = this.eventToPoint(ev);
        this.navigateToPoint(pt);
    }

    public eventToPoint($event: MouseEvent): Point {
        // Changing coordinate systems taken from:
        // https://www.sitepoint.com/how-to-translate-from-dom-to-svg-coordinates-and-back-again/
        const svg = this.$refs.svg as SVGSVGElement;
        const group = this.$refs.group as SVGSVGElement;
        const pt = svg.createSVGPoint();
        pt.x = $event.clientX;
        pt.y = $event.clientY;
        const svgPt = pt.matrixTransform(group.getScreenCTM()!.inverse());

        return svgPt;
    }

    @Emit()
    public navigateToPoint(pt: Point): Point {
        return pt;
    }
}
export default toNative(ScrollMap);
</script>

<style lang="scss" scoped>
#scroll-map {
     background: #d8e3eb;
}

rect {
    stroke: blue;
    stroke-width: 1px;
    fill: none;
}
</style>
