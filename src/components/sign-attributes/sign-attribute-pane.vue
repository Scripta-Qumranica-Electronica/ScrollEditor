<template>
    <div class="attributes">
        <ul class="row">
            <li class="pr-1">
                <b-dropdown
                    ref="attributesMenu"
                    :disabled="!selectedSignsInterpretation.length"
                    size="sm"
                    no-caret
                    @hide="onAttributesMenuHide($event)"
                >
                    <template v-slot:button-content>
                        <i class="fa fa-plus" @click="onAddAttributeMenuOpen()"/>
                    </template>

                    <b-dropdown
                        v-for="attr in attributeMenu"
                        :key="attr.attributeId"
                        variant="link"
                        class="dropdown-attr"
                        dropright
                        @show="onValuesMenuShow()"
                        @hide="onValuesMenuHide()"
                    >
                        <template v-slot:button-content>
                            <span class="attr-name">{{attr.attributeName}}</span>
                        </template>
                        <b-dropdown-item
                            v-for="attrValue in attr.values"
                            :key="attrValue.id"
                            @click="onAddAttribute(attr, attrValue)"
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
import { AttributeDTO, AttributeValueDTO, InterpretationAttributeDTO } from '@/dtos/sqe-dtos';
import SignAttribute from './sign-attribute.vue';
import SignAttributeModal from './sign-attribute-modal.vue';
import { TextFragmentAttributeOperation } from '@/views/artefact-editor/operations';
import { BDropdown, BvEvent } from 'bootstrap-vue';

@Component({
    name: 'sign-attribute-pane',
    components: {
        'sign-attribute-modal': SignAttributeModal,
        'sign-attribute': SignAttribute,
    },
})
export default class SignAttributePane extends Vue {
    private keepOpen = false;
    private attributeMenu: AttributeDTO[] = [];

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

        if (!this.selectedSignsInterpretation.length) {
            return [];
        }

        for (const si of this.selectedSignsInterpretation) {
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

        const attributes = this.selectedSignsInterpretation[0].attributes.filter(
            (attr) => attributeValues.includes(attr.attributeValueId)
        );
        return attributes;
    }

    private onAttributeClick(attribute: InterpretationAttributeDTO) {
        this.$state.artefactEditor.selectedAttribute = attribute;
        this.$root.$emit('bv::show::modal', 'sign-attribute-modal');
    }

    private onAddAttribute(attr: AttributeDTO, attrVal: AttributeValueDTO) {
        const ops: TextFragmentAttributeOperation[] = [];
        for (const si of this.$state.artefactEditor.selectedSignsInterpretation) {
            const op = new TextFragmentAttributeOperation(
                si.id,
                attrVal.id,
                {
                    attributeId: attr.attributeId,
                    attributeString: attr.attributeName,
                    attributeValueId: attrVal.id,
                    attributeValueString: attrVal.value,
                } as InterpretationAttributeDTO
            );
            op.redo();
            ops.push(op);
        }
        this.$state.eventBus.emit('new-bulk-operations', ops);
    }

    private onAddAttributeMenuOpen() {
        this.attributeMenu = this.prepareAttributesMenu();
    }

    private prepareAttributesMenu(): AttributeDTO[] {
        if (!this.selectedSignsInterpretation.length) {
            return [];
        }

        const filteredAttributes: AttributeDTO[] = [];
        const attributesSet: Set<number> = new Set<number>();
        const attributesValuesSet: Set<number> = new Set<number>();

        for (const si of this.selectedSignsInterpretation) {
            for (const attribute of si.attributes) {
                attributesSet.add(attribute.attributeId);
                attributesValuesSet.add(attribute.attributeValueId);
            }
        }

        for (const attributeMeta of this.attributesMetadata) {

            const attributeCopy = {...attributeMeta};
            // check repeatable
            if (attributesSet.has(attributeMeta.attributeId) && !attributeMeta.repeatable) {
                continue;
            }

            // multiple: only batchEditable
            if (this.selectedSignsInterpretation.length > 1 && !attributeMeta.batchEditable) {
                continue;
            }

            // single: only editable
            if (this.selectedSignsInterpretation.length === 1 && !attributeMeta.editable) {
                continue;
            }

            // repeatable: remove existing values
            if (attributesSet.has(attributeMeta.attributeId) && attributeMeta.repeatable) {
                for (const attributeValue of attributeMeta.values) {
                    if (attributesValuesSet.has(attributeValue.id)) {
                        const idx = attributeCopy.values.findIndex(value => value.id === attributeValue.id);
                        attributeCopy.values.splice(idx, 1);
                    }
                }
            }

            filteredAttributes.push(attributeCopy);
        }

        return filteredAttributes;
    }

    private onValuesMenuShow() {
        this.keepOpen = true;
    }

    private onValuesMenuHide() {
        this.keepOpen = false;
        // (this.$refs.attributesMenu as BDropdown).hide();
    }

    private onAttributesMenuHide(event: BvEvent) {
        if (this.keepOpen) {
            event.preventDefault();
        }
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
.dropdown-attr {
    width: 100%;
    .attr-name {
        width: 100%;
        display: inline-block;
        font-size: 14px;
    }
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
