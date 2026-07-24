<template>
    <!-- Plain flex div, NOT a bootstrap b-row: `.row > *` forces width:100% on any
         child that isn't a `.col`, which made the toolboxes stack full-width and
         overflow the bar (the imaged-object editor bug). -->
    <div class="toolbar border-bottom">
        <slot />
    </div>
</template>
<script lang="ts">
import { Component, Prop, Vue, toNative } from 'vue-facing-decorator';

@Component({
    name: 'toolbar',
})
class Toolbar extends Vue {
    @Prop({default: false}) public noGutters!: boolean;

}
export default toNative(Toolbar);
</script>
<style lang="scss" scoped>

@import '@/assets/styles/_variables.scss';

.toolbar {
    // Lay the toolboxes out horizontally and let them wrap gracefully. Without an
    // explicit flex context here the toolboxes render as full-width block children
    // (each on its own line) and, with a FIXED height, overflow the toolbar onto the
    // canvas below — the imaged-object editor hit exactly this (the artefact editor
    // only escaped it by nesting its toolboxes in its own flex wrapper). min-height
    // (not height) lets the bar grow to contain wrapped rows instead of clipping.
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    min-height: $toolbar-height;
    padding: 10px;
    // background: $white;
}
</style>
