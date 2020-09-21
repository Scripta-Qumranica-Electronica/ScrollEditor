<template>
    <div class="attributes">
        <ul class="row">
            <li class="pr-1">
                <b-button @click="onAddAttribute"><i class="fa fa-plus"/></b-button>
            </li>
            <li class="pr-2"
                v-for="attribute in attributes"
                :key="attribute.interpretationAttributeId"
            >
                <sign-attribute :attribute="attribute" @attribute-click="onAttributeClick(attribute)" />
            </li>
        </ul>
        <sign-attribute-modal />
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
import SignAttribute from './sign-attribute.vue';
import SignAttributeModal from './sign-attribute-modal.vue';

@Component({
    name: 'sign-attribute-pane',
    components: {
        'sign-attribute-modal': SignAttributeModal,
        'sign-attribute': SignAttribute,
    }
})
export default class SignAttributePane extends Vue {

    public get artefactEditor() {
        return this.$state.artefactEditor;
    }
    public get selectedSignsInterpretation(): SignInterpretation[] {
         return this.artefactEditor.selectedSignsInterpretation;
    }

    public get attributes(): InterpretationAttributeDTO[] {
        let attributeValues: number[] = [];
        let first = true;

        if (!this.$state.artefactEditor.selectedSignsInterpretation.length) {
            return [];
        }

        for (const si of this.$state.artefactEditor.selectedSignsInterpretation) {
            const siValues = [...si.attributes.map(attr => attr.attributeValueId)];
            if (first) {
                first = false;
                attributeValues = siValues;
            } else {
                attributeValues = attributeValues.filter(val => siValues.includes(val));
            }
        }

        const attributes = this.$state.artefactEditor.selectedSignsInterpretation[0].attributes.filter(attr => attributeValues.includes(attr.attributeValueId));
        return attributes;
    }

    private onAttributeClick(attribute: InterpretationAttributeDTO) {
        this.$state.artefactEditor.selectedAttribute = attribute;
        this.$root.$emit('bv::show::modal', 'sign-attribute-modal');
    }

    private onAddAttribute() {
        console.debug('onAddAttribute called, pop up context menu');
    }
}
</script>

<style lang="scss" scoped>
.attributes {
    height: 10%;
    border-top: 3px solid #6c757d;
    padding: 10px;
    ul {
        list-style: none;
    }
}
</style>
