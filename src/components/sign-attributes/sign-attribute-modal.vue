<template>
    <b-modal id="sign-attribute-modal" hide-header hide-footer @hide="onHide">
        <div v-if="attribute">
            <b-row>
                <b-col cols="2" />
                <b-col cols="7">
                    <sign-attribute-badge :attribute="attribute" />
                    <span class="description small">{{description}}</span>
                </b-col>
                <b-col cols="3">
                    <b-button :disabled="!deleteAllowed" @click="onDeleteAttribute">
                        <i class="fa fa-trash"></i>
                    </b-button>
                </b-col>
            </b-row>
            <b-row v-if="!isMultiSelect">
                <b-col cols="2">
                    <label for="comment">Comment</label>
                </b-col>
                <b-col cols="7">
                    <b-form-input
                        id="comment"
                        class="inputsm"
                        type="search"
                        v-model="comment"
                        @update="onCommentUpdated"
                        placeholder="Comment"
                    />
                </b-col>
                <b-col cols="3"/>
            </b-row>
        </div>

        <!-- <template v-slot:modal-footer>
            <b-button size="sm" @click="onSave">Save</b-button>
        </template>-->
    </b-modal>
</template>

<script lang="ts">
import { AttributeValueDTO, CommentaryDTO, InterpretationAttributeDTO } from '@/dtos/sqe-dtos';
import { TextFragmentAttributeOperation } from '@/views/artefact-editor/operations';
import { BvModalEvent } from 'bootstrap-vue';
import { Component, Prop, Vue, Emit, Watch } from 'vue-property-decorator';
import SignAttributeBadge from './sign-attribute-badge.vue';
// import ErrorService from '@/services/error';

@Component({
    name: 'sign-attribute-modal',
    components: {
        'sign-attribute-badge': SignAttributeBadge,
    },
})
export default class SignAttributeModal extends Vue {
    private comment: string = '';

    private mounted() {
        this.setComment(this.attribute);
    }

    private get attribute() {
        return this.$state.artefactEditor.selectedAttribute;
    }

    private get deleteAllowed() {
        return true;
    }

    private get isMultiSelect() {
        return this.$state.artefactEditor.selectedSignsInterpretation.length !== 1;
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

    @Watch('attribute')
    private onAttributeChanged(
        newAttribute: InterpretationAttributeDTO | null
    ) {
        this.setComment(newAttribute);
    }

    private setComment(newAttribute: InterpretationAttributeDTO | null) {
        this.comment = newAttribute?.commentary?.commentary || '';
    }

    private onCommentUpdated() {
        if (this.isMultiSelect) {
            console.warn("Can't update a comment when multiple signs are selected");
            return;
        }

        const si = this.$state.artefactEditor.selectedSignsInterpretation[0]; // Only one element, since !isMultiSelect
        const newAttr: InterpretationAttributeDTO = {...this.attribute!};

        newAttr.commentary =  this.comment ? { commentary: this.comment } as CommentaryDTO : undefined;

        // Create an operation that will be added to the undo/redo management of the artefact editor
        const op = new TextFragmentAttributeOperation(si, this.attribute!.attributeValueId, newAttr);

        op.redo(); // Apply change
        this.$state.eventBus.emit('new-operation', op);

        console.debug('sign-attribute-modal comment updated: ', op, this.comment);
    }

    private onDeleteAttribute() {
        for (const si of this.$state.artefactEditor.selectedSignsInterpretation) {
            const op = new TextFragmentAttributeOperation(si, this.attribute!.attributeValueId, undefined);
            op.redo();
            console.debug('sign-attribute-modal deleting sign-interpretation attribute');
            this.$state.eventBus.emit('new-operation', op);
        }
    }

    private onHide() {
        this.$state.artefactEditor.selectedAttribute = null;
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
</style>
