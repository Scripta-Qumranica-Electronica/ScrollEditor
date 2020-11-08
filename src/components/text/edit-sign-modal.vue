<template>
    <div>
        <b-modal
            id="editSignModal"
            :title="isEditMode ? 'Edit' : 'Add'"
            hide-footer
            @shown="shown"
        >
            <b-row v-if="editedSi">
                <b-col>
                    <div>
                        <b-input
                            type="text"
                            @keydown="isLetter($event)"
                            v-model="newCharacter"
                            class="w-input"
                        ></b-input>
                    </div>
                </b-col>
                <b-col>
                    <div>
                        <b-form-select
                            v-model="newAttributeValueId"
                            Edit
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
                        :checked="editedSi.isReconstructed"
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
        this.newAttributeValueId = this.editedSiSignType!.attributeValueId;
        this.isReconstructed = !!this.isReconstructedAttribute;
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
        } else return true;
    }

    private get isReconstructedAttribute():
        | InterpretationAttributeDTO
        | undefined {
        const attr = (
            this.$state.editions.current?.attributeMetadata?.allAttributes || []
        ).find((attr) => attr.attributeName === 'is_reconstructed')!;

        return attr.values
            .map(
                (x) =>
                    ({
                        interpretationAttributeId: attr.attributeId,
                        attributeString: attr.attributeName,
                        attributeValueString: x.value,
                        attributeValueId: x.id,
                    } as InterpretationAttributeDTO)
            )
            .find((y) => y.attributeValueString === 'TRUE');
    }

    public get editedSiSignType(): InterpretationAttributeDTO | undefined {
        return this.editedSi?.attributes.find(
            (attr) => attr.attributeString === 'sign_type'
        );
    }

    // public setReconstructed(value: boolean) {
    //     if (value) {
    //         this.editedSi?.attributes.push(this.isReconstructedAttribute);
    //     } else {
    //         const isReconstructedAttrIdx = this.editedSi?.attributes.findIndex(
    //             (attr) => attr.attributeString === 'is_reconstructed'
    //         );
    //         if (isReconstructedAttrIdx > -1) {
    //             this.editedSi?.attributes.splice(isReconstructedAttrIdx, 1);
    //         }
    //     }
    // }

    public isLetter(e: any) {
        this.newCharacter = '';
        const char = String.fromCharCode(e.keyCode);
        if (/^[a-z\u0590-\u05fe]+$/i.test(char)) {
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
        } else {
            this.updateSignInterpretation();
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
