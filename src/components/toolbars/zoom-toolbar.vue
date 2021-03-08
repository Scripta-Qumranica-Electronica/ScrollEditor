
<template>
  <b-container id="zoom-gadget">
      <!-- <b-row align-v="center"> -->
        <!-- <b-col class="col"> -->
         <!-- <b-col class="col-xl-6 col-lg-6 col-md-6 col-sm-6 col-xs-6 position-zoom"> -->
         <!-- <b-col class="col-5 position-zoom"> -->
            <b-button-group>
                <b-button
                    @click="zoomClick(-5)"
                    :disabled="!canZoomOut"
                    variant="outline-secondary"
                >
                   <i class="fa fa-minus"></i>
                </b-button>
                <b-input
                    v-model="zoom"
                    type="number"
                    min="1"
                    max="100"
                    class="input-lg"
                ></b-input>
                <b-button
                    class="mr-0"
                    @click="zoomClick(5)"
                    :disabled="!canZoomIn"
                    variant="outline-secondary"
                >
                  <i class="fa fa-plus"></i>
                </b-button>
            </b-button-group>
        <!-- </b-col> -->
      <!-- </b-row> -->
    </b-container>
</template>

<script lang="ts">
  import { Component, Prop, Model, Vue } from 'vue-property-decorator';



  @Component({
    name: 'zoom-toolbar',
  })

export default class ZoomToolbar extends Vue {

    @Model ('zoomChanged', {type: Number}) private paramsZoom!: number;

    @Prop() private delta!: number;

    private localZoom: number = this.paramsZoom || 0.01;


    private get zoom(): number {
      return Math.round(this.paramsZoom * 100);
    }

    private set zoom(val: number) {
      if (!val) {
        val = 10;
      }
      // this.params.zoom = parseFloat(val.toString()) / 100;
      this.localZoom = parseFloat(val.toString()) / 100;

      // this.notifyChange('zoom', val);
      this.onZoomChanged(this.localZoom);
    }

    private zoomClick(percent: number) {
      if ( this.paramsZoom + percent / 100 < 1
           && this.paramsZoom + percent / 100 > 0 ) {
          this.localZoom =  this.paramsZoom + percent / 100;
      }

      this.onZoomChanged(this.localZoom);
    }

    private onZoomChanged(val: number) {
      this.$emit('zoomChanged', val);
    }

    private get canZoomIn(): boolean {
      return this.paramsZoom < 1 && this.paramsZoom + (this.delta / 100) < 1;
      //  return this.paramsZoom < 1 && Math.round(this.paramsZoom * 100) + this.delta <= 100;
    }

    private get canZoomOut(): boolean {
      return this.paramsZoom > 0  && this.paramsZoom - (this.delta  / 100) > 0;
      // return this.paramsZoom > 0 && Math.round(this.paramsZoom * 100) - this.delta > 0;
    }

  }
</script>


<style lang="scss">

.input-lg {
    width: 50% !important;
    max-width: 75px;
}

</style>
