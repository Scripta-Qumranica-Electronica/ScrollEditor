<template>
    <b-button variant="outline-secondary"
            :title="title"
            :disabled="disabled"
            :pressed="pressed"
            v-bind="$attrs">
        <font-awesome-icon v-if="icon" :icon="icon" />
        <span :class="classes">{{ title }}</span>
    </b-button>
</template>

<script lang="ts">
import { Component, Prop, Vue, toNative } from 'vue-facing-decorator';

@Component({
    name: 'toolbar-icon-button',
    inheritAttrs: false,
})
class ToolbarIconButton extends Vue {
    @Prop() public title!: string;
    @Prop() public icon!: string;
    @Prop( { default: false }) public disabled!: boolean;
    @Prop( { default: false} ) public showText!: boolean;
    @Prop( { default: undefined} ) public pressed?: boolean;
    @Prop( { default: 'xl' }) public textBreakPoint!: string;

    public get button() {
        return this.$refs.button;
    }

    public get classes() {
        const classes = ['button-text'];
        if (!this.showText) {
            classes.push('d-none');
        } else {
            if (this.textBreakPoint !== 'xs') {
                classes.push('d-none');
                classes.push(`d-${this.textBreakPoint}-inline`);
            }
        }

        return classes;
    }
}
export default toNative(ToolbarIconButton);
</script>

<style lang="scss" scoped>
.button-text {
    margin-left: 6px;
}
</style>
