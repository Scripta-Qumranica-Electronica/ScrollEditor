<template>
    <toolbox :subject="subject" :class="'align-' + align">
        <toolbar-icon-button
            class="fa fa-font"
            @click="fontSizeChanged(+delta)"
            :disabled="!canFontSizePlus"
        />
        <toolbar-icon-button
            class="fa fa-font minus"
            :disabled="!canFontSizeMinus"
            @click="fontSizeChanged(-delta)"
        />
    </toolbox>
</template>
<script lang="ts">
import { Component, Prop, Vue, toNative } from 'vue-facing-decorator';
import ToolbarIconButton from './toolbar-icon-button.vue';
import Toolbox from './toolbox.vue';

@Component({
    name: 'font-size-button-toolbox',
    components: {
        toolbox: Toolbox,
        'toolbar-icon-button': ToolbarIconButton,
    },
})
class FontSizeButtonToolbox extends Vue {
    @Prop({ default: '' }) public subject!: string;
    /** v-model binding (Vue 3: modelValue / update:modelValue) */
    @Prop({ type: Number }) public modelValue!: number;
    @Prop({ default: 2 }) public delta!: number;
    @Prop({ default: 'left' }) public align!: 'left' | 'right';

    public fontSizeLimits: { min: number; max: number } = { min: 10, max: 40 };

    public get canFontSizePlus(): boolean {
        return (
            this.modelValue < this.fontSizeLimits.max &&
            this.modelValue + this.delta < this.fontSizeLimits.max
        );
    }

    public get canFontSizeMinus(): boolean {
        return (
            this.modelValue > this.fontSizeLimits.min &&
            this.modelValue - +this.delta > this.fontSizeLimits.min
        );
    }

    public fontSizeChanged(delta: number) {
        this.onFontSizeChanged(this.modelValue + delta);
    }

    public onFontSizeChanged(val: number) {
        localStorage.setItem('font-size', val.toString());
        this.$emit('update:modelValue', val);
        // Also emit the legacy event name so the parent @fontSizeChanged listener
        // continues to work until artefact-editor-toolbar.vue is migrated.
        this.$emit('fontSizeChanged', val);
    }
}
export default toNative(FontSizeButtonToolbox);


</script>
<style lang="scss" scoped>
.minus::before {
    font-size: 10px;
    font-weight: 600;
}
</style>
