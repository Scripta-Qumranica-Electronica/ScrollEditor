<template>
    <b-row class="toolbar border-bottom" :no-gutters="noGutters">
        <slot />
    </b-row>
</template>
<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';

@Component({
    name: 'toolbar',
})
export default class Toolbar extends Vue {
    @Prop({default: false}) public noGutters!: boolean;

}
</script>
<style lang="scss" scoped>

@import '@/assets/styles/_variables.scss';

.toolbar {
    height: $toolbar-height;
    padding: 10px;
    // background: $white;
}
</style>
