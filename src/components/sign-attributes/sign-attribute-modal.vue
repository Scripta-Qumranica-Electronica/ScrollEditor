<template>
    <b-modal
        id="sign-attribute-modal"
        @hide="onHide"
        ref="signAttributeModalRef"
        title="Edit Attribute"
    >
        <div v-if="attribute">
            <b-row>
                <b-col cols="3">
                    <label for="selectAttr">{{attribute.attributeString}}</label>
                </b-col>
                <b-col cols="9">
                    <b-form-select
                        id="selectAttr"
                        v-model="selected"
                        @change="onAttributeValueChanged($event)"
                    >
                        <option :disabled="true" :value="null">{{attribute.attributeValueString}}</option>
                        <option
                            v-for="attrVal in possibleAttributeValues"
                            :key="attrVal.attributeValueId"
                            :value="attrVal"
                        >{{ attrVal.value }}</option>
                    </b-form-select>
                    <div class="mb-2">
                        <span class="description small">{{description}}</span>
                    </div>
                </b-col>
            </b-row>

            <b-row v-if="!isMultiSelect" class="mt-3">
                <b-col cols="3">
                    <label for="comment">Comment</label>
                </b-col>
                <b-col cols="9">
                    <b-form-input
                        id="comment"
                        class="inputsm"
                        type="search"
                        v-model="comment"
                        placeholder="Comment"
                    />
                </b-col>
            </b-row>
        </div>
        <template v-slot:modal-footer>
            <b-button :disabled="!deleteAllowed" @click="onDeleteAttribute">
                <i class="fa fa-trash"></i>
            </b-button>
        </template>
        <!-- <template v-slot:modal-footer>
            <b-button size="sm" @click="onSave">Save</b-button>
        </template>-->
    </b-modal>
</template>

<script lang="ts">
import {
    AttributeValueDTO,
    CommentaryDTO,
    InterpretationAttributeDTO,
} from '@/dtos/sqe-dtos';
import { TextFragmentAttributeOperation } from '@/views/artefact-editor/operations';
import { BvModalEvent } from 'bootstrap-vue';
import { Component, Vue, Watch } from 'vue-property-decorator';
import SignAttributeBadge from './sign-attribute-badge.vue';
// import ErrorService from '@/services/error';

@Component({
    name: 'sign-attribute-modal',
    components: {
        'sign-attribute-badge': SignAttributeBadge,
    },
})
export default class SignAttributeModal extends Vue {
    private selected: string | null = null;

    private get attribute() {
        return this.$state.artefactEditor.selectedAttribute;
    }

    private get comment() {
        if (this.isMultiSelect) {
            return '';
        }
        return this.attribute?.commentary?.commentary || '';
    }

    private set comment(val: string) {
        if (!this.attribute || this.isMultiSelect) {
            console.warn("Can't set comment without an attribute or with multi selection");
            return;
        }

        const si = this.$state.artefactEditor.selectedSignsInterpretation[0]; // Only one element, since !isMultiSelect
        const newAttr: InterpretationAttributeDTO = { ...this.attribute! };

        newAttr.commentary = val
            ? ({ commentary: val } as CommentaryDTO)
            : undefined;

        // Create an operation that will be added to the undo/redo management of the artefact editor
        const op = new TextFragmentAttributeOperation(
            si.id,
            this.attribute!.attributeValueId,
            newAttr
        );

        op.redo(); // Apply change
        this.$state.eventBus.emit('new-operation', op);
    }

    private get deleteAllowed() {
        return this.attributeMetadata?.removable || false;
    }

    private get editAllowed() {
        if (this.isMultiSelect) {
            return this.attributeMetadata?.batchEditable || false;
        } else {
            return this.attributeMetadata?.editable || false;
        }
    }

    private get attributeMetadata() {
        if (!this.attribute) {
            return undefined;
        }
        return this.$state.editions.current?.attributeMetadata?.getAttribute(
            this.attribute.attributeId
        );
    }

    private get possibleAttributeValues() {
        if (!this.attribute || !this.attributeMetadata) {
            console.warn(
                "Can't return possible values if there is no attribute or metedata"
            );
            return [];
        }
        let values = this.attributeMetadata.values;

        // Remove the values that are selected by other attributes of the same id
        for (const si of this.$state.artefactEditor
            .selectedSignsInterpretation) {
            for (const attr of si.attributes.filter(
                (a) => a.attributeId === this.attribute!.attributeId
            )) {
                values = values.filter((v) => v.id !== attr.attributeValueId);
            }
        }

        return values;
    }

    private get isMultiSelect() {
        return (
            this.$state.artefactEditor.selectedSignsInterpretation.length !== 1
        );
    }

    private get description(): string {
        const metadata = this.$state.editions.current!.attributeMetadata!;
        const attrMetadata = metadata.getAttribute(this.attribute!.attributeId);

        if (!attrMetadata) {
            return '';
        }

        let description = attrMetadata.description || '';

        if (this.attribute!.attributeValueString !== 'TRUE') {
            // A non-boolean attribute
            const valueMetadata = metadata.getAttributeValue(
                this.attribute!.attributeId,
                this.attribute!.attributeValueId
            );
            if (valueMetadata && valueMetadata.description) {
                description += valueMetadata.description;
            }
        }

        return description;
    }

    private onDeleteAttribute() {
        const ops: TextFragmentAttributeOperation[] = [];
        for (const si of this.$state.artefactEditor
            .selectedSignsInterpretation) {
            const op = new TextFragmentAttributeOperation(
                si.id,
                this.attribute!.attributeValueId,
                undefined
            );
            op.redo();
            ops.push(op);
        }
        this.$state.eventBus.emit('new-bulk-operations', ops);
        this.hide();
    }

    private onAttributeValueChanged(attrVal: AttributeValueDTO) {
        const ops: TextFragmentAttributeOperation[] = [];
        for (const si of this.$state.artefactEditor
            .selectedSignsInterpretation) {
            for (const attr of si.attributes.filter(
                (a) => a.attributeValueId === this.attribute!.attributeValueId
            )) {
                const newAttr: InterpretationAttributeDTO = { ...attr };
                newAttr.attributeValueId = attrVal.id;
                newAttr.attributeValueString = attrVal.value;
                this.$state.artefactEditor.selectedAttribute = newAttr;
                const op = new TextFragmentAttributeOperation(
                    si.id,
                    attr.attributeValueId, // This is the old ID of the attribute
                    newAttr
                );
                op.redo();
                ops.push(op);
            }
        }
        this.$state.eventBus.emit('new-bulk-operations', ops);
        this.selected = null;
    }

    private hide() {
        (this.$refs.signAttributeModalRef as any).hide();
    }
    private onHide() {
        this.$state.artefactEditor.selectedAttribute = null;
    }

    @Watch('attribute')
    private onAttributeChanged() {
        // The attribute can be deleted by another user
        if (!this.attribute) {
            this.hide();
            this.$toasted.info(this.$tc('toasts.attributeDeletedBySomeoneElse'));
        }
    }
}
</script>


<style lang="scss" scoped>
.flex-container {
    display: flex;
    flex-direction: row;
    /* flex-wrap: wrap; */
    justify-content: space-between;
}

// .attribute {
//     display: inline;
// }
</style>
