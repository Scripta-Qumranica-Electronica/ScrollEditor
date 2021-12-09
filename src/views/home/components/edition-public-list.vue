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
                @edition-copy-click="openCopyEditionModal"
                :editions="editions"
                :key="item"
                :index="item"
            />
        </DynamicScrollerItem>
    </DynamicScroller>
</template>       

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import { EditionInfo } from '@/models/edition';
import EditionPublicRow from './edition-public-row.vue';

@Component({
    name: 'editions-public-list',
    components: {
        EditionPublicRow,
    },
})
export default class EditionsPublicList extends Vue {
    @Prop() public editions!: EditionInfo[];

    protected get indices() {
        const indices: number[] = [];
        for (let idx = 0; idx < this.editions.length; idx += 4) {
            indices.push(idx);
        }

        return indices;
    }

    protected openCopyEditionModal(edition: EditionInfo) {
        this.$state.editions.current = edition;
        this.$root.$emit('bv::show::modal', 'copy-edition-modal');
    }

    protected getWindowWidth() {
        return window.outerWidth;
    }
}
</script>

<style  lang="scss" scoped>
@import '@/assets/styles/_variables.scss';
@import '@/assets/styles/_fonts.scss';

#public-list {
    overflow-y: auto;
    max-height: calc(100vh - 240px);
}
</style>
