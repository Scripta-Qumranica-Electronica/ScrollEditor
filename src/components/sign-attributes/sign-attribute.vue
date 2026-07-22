<template>
    <div class="attribute" @click="onClick">
        <sign-attribute-badge :attribute="attribute"/>
    </div>
</template>

<script lang="ts">
import { Component, Prop, Vue, Emit, toNative } from 'vue-facing-decorator';
import { InterpretationAttributeDTO } from '@/dtos/sqe-dtos';
import SignAttributeBadge from './sign-attribute-badge.vue';

@Component({
    name: 'sign-attribute',
    components: {
        'sign-attribute-badge': SignAttributeBadge,
    }
})
class SignAttribute extends Vue {
    @Prop()
    public attribute!: InterpretationAttributeDTO;
    @Prop({ default: false })
    public multipleSigns!: boolean;

    public onClick() {
        this.attributeClick();
    }

    @Emit()
    public attributeClick() {
        return this.attribute;
    }
}
export default toNative(SignAttribute);
</script>

<style lang="scss" scoped>
</style>
