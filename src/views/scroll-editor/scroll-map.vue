<template>
    <div id="scroll-map" ref="scrollMap">
        <svg
            v-if="ready"
            :width="actualWidth"
            :height="actualHeight"
            :viewBox="`${actualXOrigin} ${actualYOrigin} ${actualWidth} ${actualHeight}`"
        >
            <g id="root" :transform="transform">
                <rect v-if="viewport" :x="viewport.x" :y="viewport.y" :width="viewport.width" :height="viewport.height" vector-effect="non-scaling-stroke"/>
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
import { Component, Prop, Vue, Emit, Watch } from 'vue-property-decorator';
import { BoundingBox } from '@/utils/helpers';
import ArtefactSillhouette from './artefact-sillhouette.vue';

@Component({
    name: 'scroll-map',
    components: {
        'artefact-sillhouette': ArtefactSillhouette,
    },
})
export default class ScrollMap extends Vue {
    private width: number = 0;
    private ready = false;
    private observer?: ResizeObserver;
    private scaleFactor = 1;

    public created() {
        this.observer = new ResizeObserver(entities => this.onResize());
        this.ready = false;
    }

    public mounted() {
        this.observer!.observe(this.$refs.scrollMap as Element);
        this.onResize();
        this.ready = true;
    }

    public destroyed() {
        this.observer!.disconnect();
    }

    private get transform() {
        return `scale(${this.scaleFactor})`;
    }

    private get edition() {
        return this.$state.editions.current!;
    }

    private onResize() {
        const div = this.$refs.scrollMap as Element;
        const width = div.clientWidth;

        this.scaleFactor = width / (this.edition.metrics.width * this.edition.ppm);
    }

    private get viewport() {
        return this.$state.scrollEditor.viewport;
    }

    private get actualWidth() {
        return this.edition.metrics.width * this.edition.ppm * this.scaleFactor;
    }

    private get actualHeight() {
        return this.edition.metrics.height * this.edition.ppm * this.scaleFactor;
    }

    private get actualXOrigin() {
        return this.edition.metrics.xOrigin * this.edition.ppm * this.scaleFactor;
    }

    private get actualYOrigin() {
        return this.edition.metrics.yOrigin * this.edition.ppm * this.scaleFactor;
    }

    private get placedArtefacts() {
        const artefacts = this.$state.artefacts.items;
        return artefacts
            .filter(x => x.isPlaced)
            .sort((a, b) => (a.placement.zIndex > b.placement.zIndex ? 1 : -1));
    }
}
</script>

<style lang="scss">
#scroll-map {
    background: #7bb6e0;
}

rect {
    stroke: blue;
    stroke-width: 1px;
    fill: none;
}
</style>
