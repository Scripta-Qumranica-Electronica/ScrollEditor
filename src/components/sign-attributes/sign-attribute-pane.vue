<template>
    <div class="attributes ">
        <ul class="row m-0 mt-1 p-0 ">
            <li class="m-0 p-0 pr-1" v-if="!readOnly">
                <b-dropdown
                    ref="attributesMenu"
                    :disabled="!selectedSignInterpretations.length"
                    size="sm"
                    no-caret
                    @hide="onAttributesMenuHide($event)"
                >
                    <template v-slot:button-content>
                        <i
                            class="fa fa-plus"
                            @click="onAddAttributesMenuOpen()"
                        />
                    </template>

                    <b-dropdown
                        v-for="attr in attributesMenu"
                        :key="attr.attributeId"
                        variant="link"
                        class="dropdown-attr"
                        dropright
                        @show="onValuesMenuShow()"
                        @hide="onValuesMenuHide()"
                    >
                        <template v-slot:button-content>
                            <span class="attr-name">{{
                                attr.attributeName
                            }}</span>
                        </template>
                        <b-dropdown-item
                            v-for="attrValue in attr.values"
                            :key="attrValue.id"
                            @click="onAddAttribute(attr, attrValue)"
                            >{{ attrValue.value }}</b-dropdown-item
                        >
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
        <comment v-model="comment" v-if="!isMultiSelect" class="row mt-1" />
        <sign-attribute-modal />
    </div>
</template>

<script lang="ts">
import { Component, Vue, Watch } from 'vue-property-decorator';
import { SignInterpretation } from '@/models/text';
import {
    AttributeDTO,
    AttributeValueDTO,
    InterpretationAttributeDTO,
} from '@/dtos/sqe-dtos';
import SignAttribute from './sign-attribute.vue';
import SignAttributeModal from './sign-attribute-modal.vue';
import { SignInterpretationCommentOperation, TextFragmentAttributeOperation } from '@/views/artefact-editor/operations';
import { BDropdown, BvEvent } from 'bootstrap-vue';
import CommentComponent from '../comment/comment.vue';

@Component({
    name: 'sign-attribute-pane',
    components: {
        'sign-attribute-modal': SignAttributeModal,
        'sign-attribute': SignAttribute,
        'comment': CommentComponent,
    },
})
export default class SignAttributePane extends Vue {
    private keepOpen = false;
    private attributesMenu: AttributeDTO[] = [];

    private get readOnly(): boolean {
        return this.$state.editions.current!.permission.readOnly;
    }


    public get editorState() {
        return this.$state.textFragmentEditor;
    }

    public get selectedSignInterpretations(): SignInterpretation[] {
        return this.editorState.selectedSignInterpretations;
    }

    // The comment in the state.
    private get comment(): string {
        if (this.selectedSignInterpretations.length !== 1) {
            return '';
        }

        return this.selectedSignInterpretations[0].commentary || '';
    }

    private set comment(val: string) {
        if (this.selectedSignInterpretations.length !== 1) {
            console.warn("Can't change ta comment without one selected sign interperation");
            return;
        }

        const op = new SignInterpretationCommentOperation(this.selectedSignInterpretations[0].id, val);
        op.redo(true);
        this.$state.eventBus.emit('new-operation', op);
    }

    private get attributesMetadata() {
        return (
            this.$state.editions.current?.attributeMetadata?.allAttributes || []
        );
    }

    public get attributes(): InterpretationAttributeDTO[] {
        // Get the common attributes from all the selected sign interpretations -
        // only attributes that appear in all sign interpretations are shown.
        let attributeValues: number[] = [];
        let first = true;

        if (!this.selectedSignInterpretations.length) {
            return [];
        }

        // Calculate the intersection of the attributes of all the sign interpretations
        for (const si of this.selectedSignInterpretations) {
            const siValues = si.attributes.map((attr) => attr.attributeValueId);
            if (first) {
                first = false;
                attributeValues = siValues;
            } else {
                attributeValues = attributeValues.filter((val) =>
                    siValues.includes(val)
                );
            }
        }

        // selectedSignInterpretations has at least one element
        const attributes = this.selectedSignInterpretations[0].attributes.filter(
            (attr) => attributeValues.includes(attr.attributeValueId)
        );
        return attributes;
    }

    private get isMultiSelect() {
        return (
            this.$state.textFragmentEditor.selectedSignInterpretations.length !== 1
        );
    }

    private onAttributeClick(attribute: InterpretationAttributeDTO) {
        this.$state.textFragmentEditor.selectedAttribute = attribute;
        this.$root.$emit('bv::show::modal', 'sign-attribute-modal');
    }

    private onAddAttribute(attr: AttributeDTO, attrVal: AttributeValueDTO) {
        const ops: TextFragmentAttributeOperation[] = [];
        for (const si of this.$state.textFragmentEditor.selectedSignInterpretations) {
            const op = new TextFragmentAttributeOperation(si.id, attrVal.id, {
                attributeId: attr.attributeId,
                attributeString: attr.attributeName,
                attributeValueId: attrVal.id,
                attributeValueString: attrVal.value,
            } as InterpretationAttributeDTO);
            op.redo(true);
            ops.push(op);
        }
        this.$state.eventBus.emit('new-bulk-operations', ops);
        this.keepOpen = false;
        (this.$refs.attributesMenu as BDropdown).hide();
    }

    private onAddAttributesMenuOpen() {
        this.attributesMenu = this.prepareAttributesMenu();
    }

    private prepareAttributesMenu(): AttributeDTO[] {
        if (!this.selectedSignInterpretations.length) {
            return [];
        }

        const filteredAttributes: AttributeDTO[] = [];
        const attributesSet: Set<number> = new Set<number>();
        const attributesValuesSet: Set<number> = new Set<number>();

        for (const si of this.selectedSignInterpretations) {
            for (const attribute of si.attributes) {
                attributesSet.add(attribute.attributeId);
                attributesValuesSet.add(attribute.attributeValueId);
            }
        }

        for (const attributeMeta of this.attributesMetadata) {
            const attributeCopy = { ...attributeMeta };
            // check repeatable
            if (
                attributesSet.has(attributeMeta.attributeId) &&
                !attributeMeta.repeatable
            ) {
                continue;
            }

            // multiple: only batchEditable
            if (
                this.selectedSignInterpretations.length > 1 &&
                !attributeMeta.batchEditable
            ) {
                continue;
            }

            // single: only editable
            if (
                this.selectedSignInterpretations.length === 1 &&
                !attributeMeta.editable
            ) {
                continue;
            }

            // repeatable: remove existing values
            if (
                attributesSet.has(attributeMeta.attributeId) &&
                attributeMeta.repeatable
            ) {
                for (const attributeValue of attributeMeta.values) {
                    if (attributesValuesSet.has(attributeValue.id)) {
                        const idx = attributeCopy.values.findIndex(
                            (value) => value.id === attributeValue.id
                        );
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
    /* height: calc(36vh - 2rem); */
    height: calc(30vh - 2rem);
    border-top: 3px solid #6c757d;
    padding: 10px;
    margin-top: 3.5rem;
    margin-right: 13px;
    overflow-y: auto;

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

.dropdown-attr {
    width: 100%;
    height: 100%;
    .attr-name {
        width: 100%;
        display: inline-block;
        font-size: 14px;
        color: black;


    }
    .btn-link {
        font-weight: 400;
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

<style lang="scss">
.dropdown-attr {
    width: 100%;

    .attr-name {
        width: 100%;
        display: inline-block;
        font-size: 14px;
        color: black;


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

        &::after{
            color:black;
        }
    }
    ul {
        font-size: 12px;
    }
}



</style>
