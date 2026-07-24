<template>
    <b-button variant="outline-secondary"
            :title="title"
            :disabled="disabled"
            :pressed="pressed"
            v-bind="$attrs"
            v-on="listeners">
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

    // Under @vue/compat MODE 2, a parent's `@click` (and other native listeners) on
    // this component arrive via Vue-2-style `$listeners`, NOT `$attrs`. With
    // inheritAttrs:false we forward `$attrs` to the inner <b-button>, but that alone
    // drops the listeners — so every toolbar icon button's click was silently dead.
    // Forward `$listeners` too. (Post-compat, listeners live in $attrs and this is an
    // empty/undefined bind — harmless.)
    public get listeners(): Record<string, unknown> {
        return (this as unknown as { $listeners?: Record<string, unknown> }).$listeners ?? {};
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
