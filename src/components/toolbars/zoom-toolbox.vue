
<template>
    <toolbox :subject="subject">
        <b-button-group>
            <toolbar-icon-button
                title="Zoom Out"
                icon="minus"
                @click="zoomClick(-delta)"
                :disabled="!canZoomOut || disabled"
            />

            <b-input
                class="zoom-input no-arrows"
                v-model="zoom"
                type="number"
                min="1"
                max="100"
                :disabled="disabled"
            ></b-input>

            <toolbar-icon-button title="Zoom In" icon="plus"
                :disabled="!canZoomIn || disabled"
                @click="zoomClick(+delta)"/>
            <b-button v-if="reset" variant="outline-secondary" @click="onReset" :disabled="disabled">Reset</b-button>
        </b-button-group>
    </toolbox>
</template>

<script lang="ts">
import { Component, Prop, Model, Vue } from 'vue-property-decorator';
import ToolbarIconButton from './toolbar-icon-button.vue';
import Toolbox from './toolbox.vue';

@Component({
    name: 'zoom-toolbox',
    components: {
        'toolbar-icon-button': ToolbarIconButton,
        'toolbox': Toolbox,
    }
})
export default class ZoomToolbox extends Vue {
    @Model('zoomChanged', { type: Number }) private paramsZoom!: number;

    @Prop({ default: 0.05 }) public delta!: number;
    @Prop({ default: false }) public reset!: boolean;
    @Prop({ default: false}) public disabled!: boolean;

    @Prop({ default: 'Zoom'}) public subject!: string;

    private localZoom: number = this.paramsZoom || 0.1;

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

    private get zoom(): number {
        return Math.round(this.paramsZoom * 100);
    }

    private set zoom(val: number) {
        if (!val) {
            val = 10;
        }

        this.localZoom = parseFloat(val.toString()) / 100;

        this.onZoomChanged(this.localZoom);
    }

    private zoomClick(percent: number) {
        if (this.paramsZoom + percent > 1) {
            this.localZoom = 1;
        } else if (this.paramsZoom + percent < 0) {
            this.localZoom = 0.01;
        } else {
            this.localZoom = this.paramsZoom + percent;
        }

        this.onZoomChanged(this.localZoom);
    }

    private onZoomChanged(val: number) {
        this.$emit('zoomChanged', val);
    }

    private get canZoomIn(): boolean {
        return this.paramsZoom < 1;
        //  return this.paramsZoom < 1 && Math.round(this.paramsZoom * 100) + this.delta <= 100;
    }

    private get canZoomOut(): boolean {
        return this.paramsZoom > 0;
        // return this.paramsZoom > 0 && Math.round(this.paramsZoom * 100) - this.delta > 0;
    }

    protected onReset() {
      this.zoom = 100;
    }
}
</script>


<style lang="scss" scoped>
.zoom-input {
    max-width: 2.5rem;
    padding-left: 4px;
    padding-right: 4px;
    text-align: center;
}
</style>
