<template>
    <toolbox :subject="subject">
        <b-button-group>
            <rotate-button
                direction="left"
                @click="onRotateClick(-delta)"
                class="mr-0"
            />
            <b-form-input
                :disabled="!enableText"
                type="number"
                v-model="rotationAngle"
                class="input-lg no-arrows"
            />
            <rotate-button direction="right" @click="onRotateClick(+delta)" />
        </b-button-group>
        <!-- <span v-if="!enableText" class="rotation"> {{ paramsRotationAngle }} ° </span> -->
    </toolbox>
</template>


<script lang="ts">
import { Component, Prop, Model, Vue } from 'vue-property-decorator';
import RotateButton from './rotate-button.vue';
import Toolbox from './toolbox.vue';

@Component({
    name: 'rotation-toolbox',
    components: {'rotate-button': RotateButton, toolbox: Toolbox},
})
export default class RotationToolbox extends Vue {
    @Model('rotationAngleChanged', { type: Number })
    private paramsRotationAngle!: number;
    @Prop({ default: 1 }) private delta!: number;
    @Prop() private enableText!: number;
    @Prop({ default: 'Rotate Artefact'}) public subject!: string;

    private localRotateAngle: number = this.paramsRotationAngle || 0;

    //  angle = ((angle % 360) + 360) % 360;

    public onRotateClick(degrees: number) {
        this.localRotateAngle =
            (((this.paramsRotationAngle + degrees) % 360) + 360) % 360;
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
        this.localRotateAngle = ((+val % 360) + 360) % 360;
        this.onRotationAngleChanged(this.localRotateAngle);
    }
}
</script>



<style lang="scss" scoped>
.input-lg {
    max-width: 3.5rem;
    padding-left: 4px;
    padding-right: 4px;
    text-align: center;
}

.rotation {
    width: 40px;
    text-align: center;
}
</style>
