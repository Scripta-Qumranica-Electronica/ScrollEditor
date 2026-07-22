<template>
    <b-row class="toolbar border-bottom" :no-gutters="noGutters">
        <slot />
    </b-row>
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
    height: $toolbar-height;
    padding: 10px;
    // background: $white;
}
</style>
