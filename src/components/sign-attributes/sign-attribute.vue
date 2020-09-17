<template>
    <div class="attribute" @click="onClick">
        <sign-attribute-badge :attribute="attribute"/>
    </div>
</template>

<script lang="ts">
import { Component, Prop, Vue, Emit } from 'vue-property-decorator';
import { Artefact } from '@/models/artefact';
import {
    TextFragmentData,
    TextFragment,
    SignInterpretation,
    ArtefactTextFragmentData,
} from '@/models/text';
import { EditionInfo } from '@/models/edition';
import { InterpretationAttributeDTO } from '@/dtos/sqe-dtos';
import SignAttributeBadge from './sign-attribute-badge.vue';

@Component({
    name: 'sign-attribute',
    components: {
        'sign-attribute-badge': SignAttributeBadge,
    }
})
export default class SignAttribute extends Vue {
    @Prop()
    public attribute!: InterpretationAttributeDTO;
    @Prop({ default: false })
    public multipleSigns!: boolean;

    private get isBoolean(): boolean {
        return this.attribute!.attributeValueString === 'TRUE';
    }

    private onClick() {
        this.attributeClick();
    }

    @Emit()
    private attributeClick() {
        return this.attribute;
    }
}
</script>

<style lang="scss" scoped>
</style>
