<template>
    <div>
        <b-modal
            id="editSignModal"
            :title="isEditMode ? 'Edit' : 'Add'"
            hide-footer
            @shown="shown"
            ref="my-modal"
        >
            <b-row v-if="editedSi">
                <b-col>
                    <div>
                        <b-input
                            type="text"
                            @keydown="isLetter($event)"
                            v-model="newCharacter"
                            class="w-input"
                            autofocus
                        ></b-input>
                    </div>
                </b-col>
                <b-col>
                    <div>
                        <b-form-select
                            v-model="newAttributeValueId"
                            :options="signTypes"
                            value-field="id"
                            text-field="value"
                            @input="valueField($event)"
                        ></b-form-select>
                    </div>
                </b-col>
            </b-row>
            <b-row v-if="editedSi">
                <b-col>
                    <b-form-checkbox
                        :checked="isReconstructed"
                        v-model="isReconstructed"
                        class="mt-3"
                    >
                        Reconstructed
                    </b-form-checkbox></b-col
                >
                <b-col>
                    <b-button
                        class="mt-3"
                        variant="primary"
                        :disabled="!modeButtonApply"
                        @click="statusMode()"
                        >Apply</b-button
                    >
                </b-col>
            </b-row>
        </b-modal>
    </div>
</template>

<script lang="ts">
import {
    AttributeDTO,
    AttributeValueDTO,
    InterpretationAttributeDTO,
} from '@/dtos/sqe-dtos';
import { SignInterpretation } from '@/models/text';
import { OperationsManager, SavingAgent } from '@/utils/operations-manager';
import {
    SignInterperationEditOperation,
    UpdateSignInterperationOperation,
    ArtefactEditorOperation,
    CreateSignInterpretationOperation,
} from '@/views/artefact-editor/operations';
import { Attributes } from '@fortawesome/fontawesome-svg-core';
import { Component, Vue, Watch } from 'vue-property-decorator';

@Component({
    name: 'edit-sign-modal',
})
export default class EditSignModal extends Vue {
    private editedSi: SignInterpretation | null = null;
    private newAttributeValueId: number = 0;
    private newCharacter: string = '';
    private isReconstructed: boolean = false;

    public get isEditMode(): boolean {
        return this.$state.artefactEditor.modeSignModal === 'edit';
    }

    public shown(): void {
        this.editedSi = this.$state.artefactEditor.singleSelectedSi!;

        this.newCharacter = this.editedSi.character || '';
        this.newAttributeValueId = this.editedSi.signType[0];
        this.isReconstructed = this.editedSi.isReconstructed;
        if (!this.isEditMode) {
            this.newCharacter = '';
            this.newAttributeValueId = 2;
            this.isReconstructed = false;

        }
    }

    public get editedSiSignType(): InterpretationAttributeDTO | undefined {
        return this.editedSi?.attributes.find(
            (attr) => attr.attributeString === 'sign_type'
        );
    }

    public isLetter(e: any) {
        this.newCharacter = '';
        if (![32, 8, 46].includes(e.keyCode)) {
            this.newAttributeValueId = this.signTypes.find(
                (attr) => attr.value === 'LETTER'
            )!.id;
        } else {
            this.newAttributeValueId = this.signTypes.find(
                (attr) => attr.value === 'SPACE'
            )!.id;
            e.preventDefault();
        }
    }

    public updateSignInterpretation() {
        const op = new UpdateSignInterperationOperation(
            this.editedSi!.id,
            this.newCharacter,
            this.newAttributeValueId,
            this.signTypes.find(
                (signType) => signType.id === this.newAttributeValueId
            )!.value,
            this.isReconstructed
        );
        op.redo();
        this.$state.eventBus.emit('new-operation', op);
    }

    public createSignInterpretation() {
        const op = new CreateSignInterpretationOperation(
            this.editedSi!.id,
            this.newCharacter,
            this.newAttributeValueId,
            this.signTypes.find(
                (signType) => signType.id === this.newAttributeValueId
            )!.value,
            this.isReconstructed
        );

        op.redo();
        this.$state.eventBus.emit('new-operation', op);
    }

    public statusMode() {
        if (!this.isEditMode) {
            this.createSignInterpretation();
            (this.$refs['my-modal'] as any).hide();
        } else {
            this.updateSignInterpretation();
            (this.$refs['my-modal'] as any).hide();
        }
    }

    private valueField(valueID: number) {
        const attributeValue = this.signTypes.find(
            (attrValue: AttributeValueDTO) => attrValue.id === valueID
        );
        if (attributeValue && attributeValue.value !== 'LETTER') {
            this.newCharacter = '';
        }
    }

    private get signTypes() {
        return (
            this.$state.editions.current?.attributeMetadata?.allAttributes || []
        )
            .find((attr) => attr.attributeName === 'sign_type')!
            .values.sort((a: AttributeValueDTO, b: AttributeValueDTO) => {
                return a.id > b.id ? 1 : -1;
            });
    }
    private get modeButtonApply(): boolean | undefined {
        const attributeValue = this.signTypes.find(
            (attrValue: AttributeValueDTO) =>
                attrValue.id === this.newAttributeValueId
        );
        if (
            attributeValue &&
            attributeValue.value === 'LETTER' &&
            this.newCharacter === ''
        ) {
            return false;
        } else {
            return true;
        }
    }

}
</script>

<style lang="scss" scoped>
.w-input {
    width: 100px;
    font-weight: 700;
    font-size: 18px;
}
</style>
