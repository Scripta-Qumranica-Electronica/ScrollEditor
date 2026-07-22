
<template>
    <toolbox :subject="subject">
        <b-button-group>
            <toolbar-icon-button
                title="Zoom Out"
                icon="minus"
                @click="zoomClick(-delta)"
                :disabled="!canZoomOut || disabled"
            />

            <b-form-input
                class="zoom-input no-arrows"
                v-model="zoom"
                type="number"
                min="1"
                max="100"
                :disabled="disabled"
            ></b-form-input>

            <toolbar-icon-button title="Zoom In" icon="plus"
                :disabled="!canZoomIn || disabled"
                @click="zoomClick(+delta)"/>
            <b-button v-if="reset" variant="outline-secondary" @click="onReset" :disabled="disabled">Reset</b-button>
        </b-button-group>
    </toolbox>
</template>

<script lang="ts">
import { Component, Prop, Vue, toNative } from 'vue-facing-decorator';
import ToolbarIconButton from './toolbar-icon-button.vue';
import Toolbox from './toolbox.vue';

@Component({
    name: 'zoom-toolbox',
    components: {
        'toolbar-icon-button': ToolbarIconButton,
        'toolbox': Toolbox,
    }
})
class ZoomToolbox extends Vue {
    @Prop({ type: Number, default: 0.1 }) public modelValue!: number;

    @Prop({ default: 0.05 }) public delta!: number;
    @Prop({ default: false }) public reset!: boolean;
    @Prop({ default: false}) public disabled!: boolean;

    @Prop({ default: 'Zoom'}) public subject!: string;

    public localZoom: number = this.modelValue || 0.1;

    // TODO: delete this
    // public mounted() {
    //     setTimeout(() => {
    //         this.$emit('zoomChanged', 0.1);
    //     }, 100);
    //     setTimeout(() => {
    //         this.$emit('zoomChanged', 0.11);
    //     }, 150);
    //     setTimeout(() => {
    //         this.$emit('zoomChanged', 0.1);
    //     }, 200);
    // }

    public get zoom(): number {
        return Math.round(this.modelValue * 100);
    }

    public set zoom(val: number) {
        if (!val) {
            val = 10;
        }

        this.localZoom = parseFloat(val.toString()) / 100;

        this.onZoomChanged(this.localZoom);
    }

    public zoomClick(percent: number) {
        if (this.modelValue + percent > 1) {
            this.localZoom = 1;
        } else if (this.modelValue + percent < 0) {
            this.localZoom = 0.01;
        } else {
            this.localZoom = this.modelValue + percent;
        }

        this.onZoomChanged(this.localZoom);
    }

    public onZoomChanged(val: number) {
        this.$emit('update:modelValue', val);
        this.$emit('zoomChanged', val);
    }

    public get canZoomIn(): boolean {
        return this.modelValue < 1;
        //  return this.modelValue < 1 && Math.round(this.modelValue * 100) + this.delta <= 100;
    }

    public get canZoomOut(): boolean {
        return this.modelValue > 0;
        // return this.modelValue > 0 && Math.round(this.modelValue * 100) - this.delta > 0;
    }

    public onReset() {
      this.zoom = 100;
    }
}
export default toNative(ZoomToolbox);
</script>


<style lang="scss" scoped>
.zoom-input {
    max-width: 2.5rem;
    padding-left: 4px;
    padding-right: 4px;
    text-align: center;
}
</style>
