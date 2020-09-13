<template>
    <div class="attribute" @click="onClick">
        <b-badge variant="secondary">{{attribute.attributeValueString}}</b-badge>
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
import TextFragmentComponent from '@/components/text/text-fragment.vue';
import { EditionInfo } from '@/models/edition';
import { InterpretationAttributeDTO } from '@/dtos/sqe-dtos';
import AttributeModal from './attribute-modal.vue';

@Component({
    name: 'sign-attribute',
    components: {
        'attribute-modal': AttributeModal,
    }
})
export default class SignAttribute extends Vue {
    @Prop()
    public attribute!: InterpretationAttributeDTO;
    @Prop({ default: false })
    public multipleSigns!: boolean;

    private openModal() {
        console.debug('openModal called');
        this.$root.$emit('bv::show::modal', 'attribute-modal');
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
