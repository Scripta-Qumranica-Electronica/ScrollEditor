<template>
    <!-- TODO(vue3): DynamicScroller (vue-virtual-scroller v1) is not Vue-3 compatible.
         Rendered without virtualization for now; re-add a Vue-3 virtual scroller for perf. -->
    <div id="public-list">
        <edition-public-row
            v-for="item in indices"
            :key="item"
            style="min-height: 173px"
            :editions="editions"
            :index="item"
            @show-copy-modal="$emit('show-copy-modal')"
        />
    </div>
</template>

<script lang="ts">
import { Component, Prop, Vue, toNative } from 'vue-facing-decorator';
import { EditionInfo } from '@/models/edition';
import EditionPublicRow from './edition-public-row.vue';

@Component({
    name: 'editions-public-list',
    components: {
        EditionPublicRow,
    },
    emits: ['show-copy-modal'],
})
class EditionsPublicList extends Vue {
    @Prop() public editions!: EditionInfo[];

    public get indices() {
        const indices: number[] = [];
        for (let idx = 0; idx < this.editions.length; idx += 4) {
            indices.push(idx);
        }

        return indices;
    }

    public getWindowWidth() {
        return window.outerWidth;
    }
}
export default toNative(EditionsPublicList);
</script>

<style  lang="scss" scoped>
@import '@/assets/styles/_variables.scss';
@import '@/assets/styles/_fonts.scss';

#public-list {
    overflow-y: auto;
    max-height: calc(100vh - 240px);
}
</style>
