<template>
    <b-modal lazy
        id="sign-attribute-modal"
        :model-value="isVisible"
        @update:model-value="onVisibilityChange"
        @hide="onHide"
        title="Attribute Information"
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
                        :disabled="readOnly"
                    >
                        <option :disabled="true" :value="null">{{attribute.attributeValueString}}</option>
                        <option
                            v-for="attrVal in possibleAttributeValues"
                            :key="attrVal.id"
                            :value="attrVal"
                        >{{ attrVal.value }}</option>
                    </b-form-select>
                    <div class="mb-2">
                        <span class="description small">{{description}}</span>
                    </div>
                </b-col>
            </b-row>

            <!-- TODO(vue3): comment.vue still uses value/input (Vue 2 v-model); update when comment.vue is migrated -->
            <comment v-if="!isMultiSelect" v-model="comment" class="mt-3" />
        </div>
        <template v-slot:footer>
            <b-button :disabled="!deleteAllowed || readOnly" @click="onDeleteAttribute">
                <i class="fa fa-trash"></i>
            </b-button>
        </template>
        <!-- <template v-slot:footer>
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
import { Component, Vue, Watch, toNative } from 'vue-facing-decorator';
import CommentComponent from '../comment/comment.vue';
import SignAttributeBadge from './sign-attribute-badge.vue';
// import ErrorService from '@/services/error';

@Component({
    name: 'sign-attribute-modal',
    components: {
        'sign-attribute-badge': SignAttributeBadge,
        'comment': CommentComponent,
    },
})
class SignAttributeModal extends Vue {
    public selected: string | null = null;
    public hidingStarted = false;

    // Vue 3: b-modal is controlled by v-model (boolean) instead of $refs.x.show()/hide()
    // The modal is shown when attribute is set (from sign-attribute-pane via state),
    // and hidden by setting the state back to null.
    public get isVisible(): boolean {
        return !!this.attribute;
    }

    public onVisibilityChange(val: boolean) {
        if (!val) {
            this.hide();
        }
    }

    public get readOnly(): boolean {
        return this.$state.editions.current!.permission.readOnly;
    }

    public get attribute() {
        return this.$state.textFragmentEditor.selectedAttribute;
    }

    public get comment() {
        if (this.isMultiSelect) {
            return '';
        }
        return this.attribute?.commentary?.commentary || '';
    }

    public set comment(val: string) {
        if (!this.attribute || this.isMultiSelect) {
            console.warn("Can't set comment without an attribute or with multi selection");
            return;
        }

        const si = this.$state.textFragmentEditor.selectedSignInterpretations[0]; // Only one element, since !isMultiSelect
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

        op.redo(true); // Apply change
        this.$state.eventBus.emit('new-operation', op);
    }

    public get deleteAllowed() {
        return this.attributeMetadata?.removable || false;
    }

    public get editAllowed() {
        if (this.isMultiSelect) {
            return this.attributeMetadata?.batchEditable || false;
        } else {
            return this.attributeMetadata?.editable || false;
        }
    }

    public get attributeMetadata() {
        if (!this.attribute) {
            return undefined;
        }
        return this.$state.editions.current?.attributeMetadata?.getAttribute(
            this.attribute.attributeId
        );
    }

    public get possibleAttributeValues() {
        if (!this.attribute || !this.attributeMetadata) {
            console.warn(
                "Can't return possible values if there is no attribute or metedata"
            );
            return [];
        }
        let values = this.attributeMetadata.values;

        // Remove the values that are selected by other attributes of the same id
        for (const si of this.$state.textFragmentEditor.selectedSignInterpretations) {
            for (const attr of si.attributes.filter(
                (a) => a.attributeId === this.attribute!.attributeId
            )) {
                values = values.filter((v) => v.id !== attr.attributeValueId);
            }
        }

        return values;
    }

    public get isMultiSelect() {
        return (
            this.$state.textFragmentEditor.selectedSignInterpretations.length !== 1
        );
    }

    public get description(): string {
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

    public onDeleteAttribute() {
        const ops: TextFragmentAttributeOperation[] = [];
        for (const si of this.$state.textFragmentEditor.selectedSignInterpretations) {
            const op = new TextFragmentAttributeOperation(
                si.id,
                this.attribute!.attributeValueId,
                undefined
            );
            op.redo(true);
            ops.push(op);
        }
        this.$state.eventBus.emit('new-bulk-operations', ops);
        this.hide();
    }

    public onAttributeValueChanged(attrVal: AttributeValueDTO) {
        const ops: TextFragmentAttributeOperation[] = [];
        for (const si of this.$state.textFragmentEditor.selectedSignInterpretations) {
            for (const attr of si.attributes.filter(
                (a) => a.attributeValueId === this.attribute!.attributeValueId
            )) {
                const newAttr: InterpretationAttributeDTO = { ...attr };
                newAttr.attributeValueId = attrVal.id;
                newAttr.attributeValueString = attrVal.value;
                this.$state.textFragmentEditor.selectedAttribute = newAttr;
                const op = new TextFragmentAttributeOperation(
                    si.id,
                    attr.attributeValueId, // This is the old ID of the attribute
                    newAttr
                );
                op.redo(true);
                ops.push(op);
            }
        }
        this.$state.eventBus.emit('new-bulk-operations', ops);
        this.selected = null;
    }

    public hide() {
        // Vue 3: dismiss by clearing the state-driven attribute (isVisible computed from attribute)
        this.hidingStarted = true;
        this.$state.textFragmentEditor.selectedAttribute = null;
    }

    public onHide() {
        this.hidingStarted = true;
        this.$state.textFragmentEditor.selectedAttribute = null;
    }

    @Watch('attribute')
    public onAttributeChanged() {
        // The attribute can be deleted by another user
        if (!this.attribute && !this.hidingStarted) {
            this.hide();
            // TODO(vue3): $toasted was removed; replace with a Vue 3 notification plugin
            console.info(this.$t('toasts.attributeDeletedBySomeoneElse'));
        }
        this.hidingStarted = false;
    }
}
export default toNative(SignAttributeModal);
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
