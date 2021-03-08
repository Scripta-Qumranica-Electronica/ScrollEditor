<template>
  <b-container id="rotation-gadget">
      <b-button-group>
        <b-button
            variant="outline-secondary"
            @click="onRotateClick(-delta)"
            v-b-tooltip.hover.bottom
            :title="$t('misc.leftRotate')"
            class="mr-0"
        >
            <font-awesome-icon
                icon="undo"
            ></font-awesome-icon>
        </b-button>
        <b-form-input
            v-if="enableText"
            type="number"
            v-model="rotationAngle"
            class="input-lg"
        />
        <b-button
            variant="outline-secondary"
            @click="onRotateClick(delta)"
            v-b-tooltip.hover.bottom
            :title="$t('misc.RightRotate')"
        >
            <font-awesome-icon
                icon="redo"
            ></font-awesome-icon>
        </b-button>
      </b-button-group>
       <span v-if="!enableText" class="rotation"> {{ paramsRotationAngle }} ° </span>
  </b-container>
</template>


<script lang="ts">


  import { Component, Prop, Model, Vue } from 'vue-property-decorator';

  @Component({
    name: 'rotation-toolbar',
  })

export default class RotationToolbar extends Vue {

    @Model ('rotationAngleChanged', {type: Number}) private paramsRotationAngle!: number;

   @Prop() private delta!: number;
   @Prop() private enableText!: number;

   private localRotateAngle: number = this.paramsRotationAngle || 0;

   //  angle = ((angle % 360) + 360) % 360;

   public onRotateClick(degrees: number) {

      this.localRotateAngle = this.paramsRotationAngle
                              + degrees / ( (90 === +this.delta) ? 1 : 10 );

      this.localRotateAngle = (( this.localRotateAngle % 360) + 360) % 360;

      this.onRotationAngleChanged(this.localRotateAngle);
    }

    private onRotationAngleChanged(val: number) {
      this.$emit('rotationAngleChanged', val);
    }

    public get rotationAngle(): number {
        return ((this.paramsRotationAngle % 360) + 360) % 360;
    }

    public set rotationAngle(val: number) {
      if (!val) {
        val = 0;
      }
      this.localRotateAngle =
            ((parseFloat(val.toString()) % 360) + 360) % 360;
      this.onRotationAngleChanged(this.localRotateAngle);
    }
  }
</script>



<style lang="scss">

.input-lg {
    width: 50% !important;
    max-width: 75px;
}

.rotation {
    width: 40px;
    text-align: center;
}

</style>
