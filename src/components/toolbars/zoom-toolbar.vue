
<template>
  <b-container no-gutters id="zoom-gadget" >

      <section class="m-0 p-0" >

          <b-button-group>
              <b-button

                  class="btn-sm btn-ex-z ml-1 mr-0 mb-2 mt-2 p-0 pb-3"
                  size="sm"
                  variant="dark"
                  text-center
                  align-v="center"
                  align-h="center"
                  @click="zoomClick(-delta)"
                  :disabled="!canZoomOut"
                >
                  <i class="fa fa-minus" align-self="center"></i>
                </b-button>

              <b-input
                v-model="zoom"
                type="number"
                min="1"
                max="100"
                size="sm"
                class="input-lg m-1 mb-1 mt-1"
              ></b-input>

              <b-button
                  class="btn-sm btn-ex-z ml-0 mr-0 mb-2 mt-2 p-0 pb-3"
                  size="sm"
                  variant="dark"
                  text-center
                  align-v="center"
                  align-h="center"
                  @click="zoomClick(+delta)"
                  :disabled="!canZoomIn"
                >
                  <i class="fa fa-plus" align-self="center"></i>
                </b-button>

          </b-button-group>

      </section>

  </b-container>
</template>

<script lang="ts">
  import { Component, Prop, Model, Vue } from 'vue-property-decorator';

  @Component({
    name: 'zoom-toolbar',
  })

export default class ZoomToolbar extends Vue {

    @Model ('zoomChanged', {type: Number}) private paramsZoom!: number;

    @Prop({default: 0.05}) private delta!: number;

    private localZoom: number = this.paramsZoom || 0.01;


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

      if ( this.paramsZoom + percent  < 1
           && this.paramsZoom + percent  > 0 ) {
          this.localZoom =  this.paramsZoom + percent;
      }

      this.onZoomChanged(this.localZoom);
    }

    private onZoomChanged(val: number) {
      this.$emit('zoomChanged', val);
    }

    private get canZoomIn(): boolean {
      return this.paramsZoom < 1 && this.paramsZoom + (+this.delta) < 1;
      //  return this.paramsZoom < 1 && Math.round(this.paramsZoom * 100) + this.delta <= 100;
    }

    private get canZoomOut(): boolean {
      return this.paramsZoom > 0  && this.paramsZoom - (+this.delta ) > 0;
      // return this.paramsZoom > 0 && Math.round(this.paramsZoom * 100) - this.delta > 0;
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


.btn-ex-z {
    /* padding: 0.1rem 0.15rem; */
    font-size: 0.75rem;
    line-height: 1.0;
    border-radius: 0.2rem;
    width: 1rem;
    height: 1.4rem;
}


</style>
