
<template>
    <b-container no-gutters id="zoom-gadget">
        <section class="m-0 p-0">
            <b-button-group>
                <toolbar-icon-button
                    title="Zoom Out"
                    icon="minus"
                    @click="zoomClick(-delta)"
                    :disabled="!canZoomOut || disabled"
                />

                <b-input
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
        </section>
    </b-container>
</template>

<script lang="ts">
import { Component, Prop, Model, Vue } from 'vue-property-decorator';
import ToolbarIconButton from './toolbar-icon-button.vue';

@Component({
    name: 'zoom-toolbar',
    components: {'toolbar-icon-button': ToolbarIconButton}
})
export default class ZoomToolbar extends Vue {
    @Model('zoomChanged', { type: Number }) private paramsZoom!: number;

    @Prop({ default: 0.05 }) public delta!: number;
    @Prop({ default: false }) public reset!: boolean;
    @Prop({ default: false}) public disabled!: boolean;

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
        if (this.paramsZoom + percent < 1 && this.paramsZoom + percent > 0) {
            this.localZoom = this.paramsZoom + percent;
        }

        this.onZoomChanged(this.localZoom);
    }

    private onZoomChanged(val: number) {
        this.$emit('zoomChanged', val);
    }

    private get canZoomIn(): boolean {
        return this.paramsZoom < 1 && this.paramsZoom + +this.delta < 1;
        //  return this.paramsZoom < 1 && Math.round(this.paramsZoom * 100) + this.delta <= 100;
    }

    private get canZoomOut(): boolean {
        return this.paramsZoom > 0 && this.paramsZoom - +this.delta > 0;
        // return this.paramsZoom > 0 && Math.round(this.paramsZoom * 100) - this.delta > 0;
    }

    protected onReset() {
      this.zoom = 100;
    }
}
</script>


<style lang="scss">
.input-lg {
    /* width: 50% !important;
    max-width: 75px; */
    width: 50% !important;
    max-width: 9rem;
}
</style>
