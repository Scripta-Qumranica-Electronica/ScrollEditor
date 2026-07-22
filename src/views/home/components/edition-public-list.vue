<template>
    <DynamicScroller
        id="public-list"
        :items="indices"
        :min-item-size="173"
        v-slot="{ item, index, active }"
    >
        <DynamicScrollerItem
            :item="item"
            :active="active"
            :size-dependencies="[getWindowWidth(), item]"
            :index="index"
        >
            <edition-public-row style="min-height: 173px"
                :editions="editions"
                :key="item"
                :index="item"
                @show-copy-modal="$emit('show-copy-modal')"
            />
        </DynamicScrollerItem>
    </DynamicScroller>
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
