<template>
    <!-- Virtualised list. vue-virtual-scroller v1 (DynamicScroller) is not Vue-3
         compatible, so we window the rows ourselves. Rows are uniform height at a
         given viewport width, so we measure one rendered row and reuse it; we
         re-measure on resize and when the data first loads. Only the visible rows
         (plus a small overscan) are ever in the DOM. -->
    <div id="public-list" ref="scroller" @scroll.passive="onScroll">
        <div class="vlist-spacer" :style="{ height: totalHeight + 'px' }">
            <edition-public-row
                v-for="item in visibleIndices"
                :key="item"
                class="vlist-row"
                :style="{ transform: `translateY(${(item / 4) * rowHeight}px)` }"
                :editions="editions"
                :index="item"
                @show-copy-modal="$emit('show-copy-modal')"
            />
        </div>
    </div>
</template>

<script lang="ts">
import { Component, Prop, Vue, Watch, toNative } from 'vue-facing-decorator';
import { EditionInfo } from '@/models/edition';
import EditionPublicRow from './edition-public-row.vue';

const COLUMNS = 4;
const OVERSCAN = 4;
const DEFAULT_ROW_HEIGHT = 189;

@Component({
    name: 'editions-public-list',
    components: {
        EditionPublicRow,
    },
    emits: ['show-copy-modal'],
})
class EditionsPublicList extends Vue {
    @Prop() public editions!: EditionInfo[];

    private scrollTop = 0;
    private viewportHeight = 0;
    // Measured from a real row; uniform per viewport width, re-measured on resize.
    public rowHeight = DEFAULT_ROW_HEIGHT;

    public mounted() {
        this.updateViewport();
        this.$nextTick(() => this.measureRow());
        window.addEventListener('resize', this.onResize, { passive: true });
    }

    public beforeUnmount() {
        window.removeEventListener('resize', this.onResize);
    }

    // Re-measure once the list is populated (starts empty while editions load).
    @Watch('editions')
    private onEditionsChanged() {
        this.$nextTick(() => this.measureRow());
    }

    private onResize() {
        this.updateViewport();
        this.measureRow();
    }

    public onScroll(e: Event) {
        this.scrollTop = (e.target as HTMLElement).scrollTop;
    }

    private updateViewport() {
        const el = this.$refs.scroller as HTMLElement | undefined;
        this.viewportHeight = el ? el.clientHeight : window.innerHeight;
    }

    private measureRow() {
        const scroller = this.$refs.scroller as HTMLElement | undefined;
        const row = scroller?.querySelector('.vlist-row') as HTMLElement | null;
        if (row && row.offsetHeight > 0) {
            this.rowHeight = row.offsetHeight;
        }
    }

    private get rowCount(): number {
        return Math.ceil(this.editions.length / COLUMNS);
    }

    public get totalHeight(): number {
        return this.rowCount * this.rowHeight;
    }

    // Edition start-indices (multiples of COLUMNS) for the rows currently in view.
    public get visibleIndices(): number[] {
        const rowHeight = this.rowHeight || DEFAULT_ROW_HEIGHT;
        const viewport = this.viewportHeight || window.innerHeight;
        const firstRow = Math.max(0, Math.floor(this.scrollTop / rowHeight) - OVERSCAN);
        const visibleRows = Math.ceil(viewport / rowHeight) + OVERSCAN * 2;
        const lastRow = Math.min(this.rowCount - 1, firstRow + visibleRows);

        const indices: number[] = [];
        for (let row = firstRow; row <= lastRow; row++) {
            indices.push(row * COLUMNS);
        }
        return indices;
    }
}
export default toNative(EditionsPublicList);
</script>

<style lang="scss" scoped>
@import '@/assets/styles/_variables.scss';
@import '@/assets/styles/_fonts.scss';

#public-list {
    overflow-y: auto;
    max-height: calc(100vh - 240px);
}

.vlist-spacer {
    position: relative;
    width: 100%;
}

.vlist-row {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
}
</style>
