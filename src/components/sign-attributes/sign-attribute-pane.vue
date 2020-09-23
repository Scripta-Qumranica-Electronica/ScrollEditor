<template>
    <div class="attributes">
        <ul class="row">
            <li class="pr-1">
                <b-dropdown :disabled="!selectedSignsInterpretation.length" size="sm" no-caret @hide="$event.preventDefault()">
                    <template v-slot:button-content>
                        <i class="fa fa-plus" />
                    </template>

                    <b-dropdown
                        v-for="attr in attributesMetadata"
                        :key="attr.attributeId"
                        variant="link"
                        class="dd"
                        dropright
                        :id="attr.attributeId"
                    >
                        <template v-slot:button-content>
                            <span
                                style="width: 100%;display: inline-block;font-size:14px;"
                            >{{attr.attributeName}}</span>
                        </template>
                        <b-dropdown-item
                            v-for="attrValue in attr.values"
                            :key="attrValue.id"
                            @click="onAddAttribute(attrValue)"
                        >{{attrValue.value}}</b-dropdown-item>
                    </b-dropdown>
                </b-dropdown>
            </li>
            <li
                class="pr-2"
                v-for="attribute in attributes"
                :key="attribute.interpretationAttributeId"
            >
                <sign-attribute
                    :attribute="attribute"
                    @attribute-click="onAttributeClick(attribute)"
                />
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
import { AttributeValueDTO, InterpretationAttributeDTO } from '@/dtos/sqe-dtos';
import SignAttribute from './sign-attribute.vue';
import SignAttributeModal from './sign-attribute-modal.vue';
import { TextFragmentAttributeOperation } from '@/views/artefact-editor/operations';

@Component({
    name: 'sign-attribute-pane',
    components: {
        'sign-attribute-modal': SignAttributeModal,
        'sign-attribute': SignAttribute,
    },
})
export default class SignAttributePane extends Vue {
    public get artefactEditor() {
        return this.$state.artefactEditor;
    }
    public get selectedSignsInterpretation(): SignInterpretation[] {
        return this.artefactEditor.selectedSignsInterpretation;
    }

    private get attributesMetadata() {
        return (
            this.$state.editions.current?.attributeMetadata?.allAttributes || []
        );
    }

    public get attributes(): InterpretationAttributeDTO[] {
        let attributeValues: number[] = [];
        let first = true;

        if (!this.$state.artefactEditor.selectedSignsInterpretation.length) {
            return [];
        }

        for (const si of this.$state.artefactEditor
            .selectedSignsInterpretation) {
            const siValues = [
                ...si.attributes.map((attr) => attr.attributeValueId),
            ];
            if (first) {
                first = false;
                attributeValues = siValues;
            } else {
                attributeValues = attributeValues.filter((val) =>
                    siValues.includes(val)
                );
            }
        }

        const attributes = this.$state.artefactEditor.selectedSignsInterpretation[0].attributes.filter(
            (attr) => attributeValues.includes(attr.attributeValueId)
        );
        return attributes;
    }

    private onAttributeClick(attribute: InterpretationAttributeDTO) {
        this.$state.artefactEditor.selectedAttribute = attribute;
        this.$root.$emit('bv::show::modal', 'sign-attribute-modal');
    }


    // private onAddAttribute(attrVal: AttributeValueDTO) {
    //     const ops: TextFragmentAttributeOperation[] = [];
    //     for (const si of this.$state.artefactEditor.selectedSignsInterpretation) {
    //             const op = new TextFragmentAttributeOperation(
    //                 si.id,
    //                 attrVal.id,
    //                 {}
    //             );
    //             op.redo();
    //             ops.push(op);
    //     }
    //     this.$state.eventBus.emit('new-bulk-operations', ops);
    // }
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
.btn-group > .btn,
.btn-group-vertical > .btn {
    position: relative;
    -ms-flex: 1 1 auto;
    flex: 1 1 auto;
    padding: 3px;
    background-color: white;
    color: black;
    border: 0px;
}
</style>
<style lang="scss">
.dd {
    width: 100%;

    .btn-link {
        font-weight: 400;
        // color: #007bff;
        text-decoration: none;
        width: 100%;
        text-align: left;
        padding-top: 0;
        padding-bottom: 0;
        color: inherit;
    }
    ul {
        font-size: 12px;
    }
}
</style>
