<template>
    <toolbox :subject="subject">
        <b-button-group>
            <rotate-button
                direction="left"
                @click="onRotateClick(-delta)"
                class="me-0"
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
import { Component, Prop, Vue, toNative } from 'vue-facing-decorator';
import RotateButton from './rotate-button.vue';
import Toolbox from './toolbox.vue';

@Component({
    name: 'rotation-toolbox',
    components: {'rotate-button': RotateButton, toolbox: Toolbox},
})
class RotationToolbox extends Vue {
    // Vue 3 v-model: prop is modelValue, event is update:modelValue.
    // Parent usages that previously used @Model('rotationAngleChanged') / .sync must be updated
    // to v-model (or :modelValue + @update:modelValue). See unresolved note.
    @Prop({ type: Number }) public modelValue!: number;
    @Prop({ default: 1 }) public delta!: number;
    @Prop() public enableText!: number;
    @Prop({ default: 'Rotate Artefact'}) public subject!: string;

    public localRotateAngle: number = this.modelValue || 0;

    public onRotateClick(degrees: number) {
        this.localRotateAngle =
            (((this.modelValue + degrees) % 360) + 360) % 360;
        this.onRotationAngleChanged(this.localRotateAngle);
    }

    public onRotationAngleChanged(val: number) {
        this.$emit('update:modelValue', val);
    }

    public get rotationAngle(): number {
        return ((this.modelValue % 360) + 360) % 360;
    }

    public set rotationAngle(val: number) {
        if (!val) {
            val = 0;
        }
        this.localRotateAngle = ((+val % 360) + 360) % 360;
        this.onRotationAngleChanged(this.localRotateAngle);
    }
}
export default toNative(RotationToolbox);
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
