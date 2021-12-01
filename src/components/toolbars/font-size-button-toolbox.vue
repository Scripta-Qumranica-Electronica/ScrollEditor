<template>
    <toolbox :subject="subject">
        <toolbar-icon-button
            icon="sort-alpha-up"
            @click="fontSizeChanged(+delta)"
            :disabled="!canFontSizePlus"
        />
        <toolbar-icon-button
            icon="sort-alpha-down"
            :disabled="!canFontSizeMinus"
            @click="fontSizeChanged(-delta)"
        />
    </toolbox>
</template>
<script lang="ts">
import Vue from 'vue';
import { Component, Prop, Model } from 'vue-property-decorator';
import ToolbarIconButton from './toolbar-icon-button.vue';
import Toolbox from './toolbox.vue';

@Component({
    name: 'font-size-button-toolbox',
    components: {
        toolbox: Toolbox,
        'toolbar-icon-button': ToolbarIconButton,
    },
})
export default class FontSizeButtonToolbox extends Vue {
    @Prop({ default: '' }) public subject!: string;
    @Model('fontSizeChanged', { type: Number }) private fontSize!: number;
    @Prop({ default: 2 }) public delta!: number;

    private fontSizeLimits: { min: number; max: number } = { min: 10, max: 40 };

    public get canFontSizePlus(): boolean {
        return (
            this.fontSize < this.fontSizeLimits.max &&
            this.fontSize + this.delta < this.fontSizeLimits.max
        );
    }

    public get canFontSizeMinus(): boolean {
        return (
            this.fontSize > this.fontSizeLimits.min &&
            this.fontSize - +this.delta > this.fontSizeLimits.min
        );
        // return this.paramsZoom > 0 && Math.round(this.paramsZoom * 100) - this.delta > 0;
    }

  
    public fontSizeChanged(delta: number) {
        this.onFontSizeChanged(this.fontSize + delta);
    }

    public onFontSizeChanged(val: number) {
        localStorage.setItem('font-size', val.toString());
        this.$emit('fontSizeChanged', val);
    }
}
</script>
