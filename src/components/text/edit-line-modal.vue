<template>
    <div>
        <b-modal
            ref="editLineModal"
            id="editLineModal"
            title="Edit Line"
            @shown="shown"
        >
            <div ref="editLineModalRef">
                <text-line
                    :line="line"
                    direction="rtl"
                    class="d-flex w-100"
                    :ref="'line-' + (line && line.lineId)"
                    :isEditMode="true"
                    @line-change="onLineChanged($event)"
                ></text-line>
            </div>
            <template v-slot:modal-footer>
                <div class="w-100-flex">
                    <b-button
                        variant="outline-primary"
                        @click="checkDifference()"
                        >Save</b-button>
                    <b-form-checkbox
                    class="recontructedCheckbox"
                        name="allSiAreReconstructed-checkbox"
                        :checked="allSiAreReconstructed"
                        @change="onReconstructedCheckBoxChanged"
                        >Reconstructed</b-form-checkbox
                    >
                </div>
            </template>
        </b-modal>
    </div>
</template>

<script lang="ts">
import { Line, SignInterpretation } from '@/models/text';
import { Component, Prop, Vue, Watch } from 'vue-property-decorator';
import TextLine from '@/components/text/text-line.vue';
import TextService from '@/services/text';
import {
    ArtefactEditLineOperation,
    ArtefactEditorOperation,
} from '@/views/artefact-editor/operations';
import { SavingAgent, OperationsManager } from '@/utils/operations-manager';
import {
    AttributeDTO,
    AttributeValueDTO,
} from '@/dtos/sqe-dtos';

@Component({
    name: 'edit-line-modal',
    components: {
        'text-line': TextLine
    }
})
export default class EditLineModal extends Vue {
    public checkText: TextService = new TextService();
    private operationsManager = new OperationsManager<ArtefactEditorOperation>(
        this
    );
    public prevText: string = '';
    public arrayDiff: any[] = [];
    public textLine: string = '';
    public get editorState() {
        return this.$state.textFragmentEditor;
    }
    public async saveEntities(
        ops: ArtefactEditorOperation[]
    ): Promise<boolean> {
        return true;
    }

    public get selectedSignInterpretation(): SignInterpretation {
        return this.editorState.selectedSignInterpretations[0];
    }
    public get allSiAreReconstructed(): boolean {
        if (this.editorState.selectedSignInterpretations.length === 0) {
            return false;
        }
        return this.editorState.selectedSignInterpretations.every(si =>
            si.attributes.some(
                attr =>
                    attr.attributeString === 'is_reconstructed' &&
                    attr.attributeValueString === 'TRUE'
            )
        );
    }

    public get line(): Line {
        return (
            this.selectedSignInterpretation &&
            this.selectedSignInterpretation.sign.line
        );
    }
    public get editionId() {
        return parseInt(this.$route.params.editionId);
    }

    public onLineChanged(event: string) {
        this.textLine = event;
    }
    public shown(): void {
        // this.isEditMode = true;
        this.$nextTick(() => {
            const lineVue = this.$refs['line-' + this.line.lineId] as any;
            const lineA = (lineVue && lineVue.$el) as HTMLElement;
            const line = lineA.querySelector('.line-container') as HTMLElement;
            if (line) {
                // set initial cursor position on first letter of line
                const range = document.createRange();
                const sel = document.getSelection();
                range.setStart(line.childNodes[1], 0);
                range.collapse(true);

                sel?.removeAllRanges();
                sel?.addRange(range);
                line.focus();
            }
            this.prevText = line.innerText;
        });
    }
    private get attributesMetadata() {
        return (
            this.$state.editions.current?.attributeMetadata?.allAttributes || []
        );
    }
    private onAddAttribute(attr: AttributeDTO, attrVal: AttributeValueDTO) {
        // const ops: TextFragmentAttributeOperation[] = [];
        for (const si of this.$state.textFragmentEditor
            .selectedSignInterpretations) {
                si.attributes[0].attributeString = 'is_reconstructed';
                si.attributes[0].attributeValueString = 'TRUE';
            //           si.attributes.some(
            //     attr =>
            //         attr.attributeString === 'is_reconstructed' &&
            //         attr.attributeValueString === 'TRUE'
            // )
            // const op = new TextFragmentAttributeOperation(si.id, attrVal.id, {
            //     attributeId: attr.attributeId,
            //     attributeString: attr.attributeName,
            //     attributeValueId: attrVal.id,
            //     attributeValueString: attrVal.value
            // } as InterpretationAttributeDTO);
            // op.redo(true);
            // ops.push(op);
        }
        // this.$state.eventBus.emit('new-bulk-operations', ops);
    }

    private onDeleteAttribute(attrVal: AttributeValueDTO) {
        // const ops: TextFragmentAttributeOperation[] = [];
        for (const si of this.$state.textFragmentEditor
            .selectedSignInterpretations) {
                    console.log(si);
                    si.attributes[1].attributeString = "sign_type";
                    si.attributes[1].attributeValueString = 'LETTER';
            // const op = new TextFragmentAttributeOperation(
            //     si.id,
            //     attrVal.id,
            //     undefined
            // );
            // op.redo(true);
            // ops.push(op);
        }
        // this.$state.eventBus.emit('new-bulk-operations', ops);
    }
    private onReconstructedCheckBoxChanged(event: boolean) {
        let reconstructedAttrDTO: AttributeDTO;
        let reconstructedAttrValueDTO: AttributeValueDTO;
        const reconstructedAttrMeta = this.attributesMetadata.find(
            a => a.attributeName === 'is_reconstructed'
        );
        if (reconstructedAttrMeta) {
            reconstructedAttrDTO = { ...reconstructedAttrMeta };
            const reconstructedAttrValueMeta = reconstructedAttrDTO?.values.find(
                a => a.value === 'TRUE'
            );
            if (reconstructedAttrValueMeta) {
                reconstructedAttrValueDTO = { ...reconstructedAttrValueMeta };
            }
            if (event) {
                this.onAddAttribute(
                    reconstructedAttrDTO!,
                    reconstructedAttrValueDTO!
                );
            } else {
                this.onDeleteAttribute(reconstructedAttrValueDTO!);
            }
        }
    }
    protected async mounted() {
        this.$state.operationsManager = this.operationsManager;
    }
    protected async created() {
        this.$state.eventBus.on(
            'change-artefact-edit-line',
            (prevText: Line) => {
                console.log(this.line, prevText);
            }
        );
    }

    // public checkDifference() {
    //     const editDiffLib = require('@/utils/edit-diff');
    //     console.log(editDiffLib);

    //     // Get the from object
    //     const arrayFrom = this.line.signs.map((s) => ({
    //         id: s.signInterpretations[0].id,
    //         character: s.signInterpretations[0].character,
    //     }));
    //     console.log(arrayFrom);

    //     const modalRef = this.$refs.editLineModalRef as HTMLElement;
    //     const lineContainer = modalRef.querySelector(
    //         '.line-container'
    //     ) as HTMLDivElement;
    //     const to = Array.from(
    //         lineContainer.querySelectorAll(':scope > span[tabindex]')
    //     ).map((s: Element) => ({
    //         id: s.getAttribute('tabindex'),
    //         character: s.textContent,
    //     }));

    //     const arrayToObject = to.reduce((obj: any, item: any) => {
    //         obj[item.id]
    //             ? (obj[item.id].character =
    //                   obj[item.id].character + item.character)
    //             : (obj[item.id] = { ...item });
    //         return obj;
    //     }, {});

    //     const arrayTo = Object.values(arrayToObject);
    //     console.log(arrayTo);

    //     const changes: Array<{id: number, character: string | undefined, change: '+'|'-'|'='}> = [];

    //     arrayFrom.forEach((signFrom) => {
    //         const id = signFrom.id;

    //         // check if sign still exist in arrayTo
    //         const signTo = arrayTo.find(
    //             (editedSign: any) => editedSign.id.toString() === id.toString()
    //         );
    //         if (!signTo) {
    //             changes.push({
    //                 id: signFrom.id,
    //                 character: signFrom.character,
    //                 change: '-',
    //             });
    //         } else {
    //             const leveinsteinDetails = editDiffLib.iqwerty.diff.diff(
    //                 signFrom.character,
    //                 signTo.character
    //             );
    //             const diffChanges = leveinsteinDetails.changes;
    //             diffChanges.forEach((diffChange: any) => {
    //                 changes.push({
    //                     id: signFrom.id,
    //                     character: diffChange.char,
    //                     change: diffChange.diff,
    //                 });
    //             });
    //         }
    //     });

    //     console.log(changes);
    // }
    public checkDifference() {
        const firstChar = this.line.signs[0].signInterpretations[0].id;
        const lastChar = this.line.signs[this.line.signs.length - 1]
            .signInterpretations[0].id;
        // const newText = this.textLine;
        const lineVue = this.$refs['line-' + this.line.lineId] as any;
        const lineA = (lineVue && lineVue.$el) as HTMLElement;
        const line = lineA.querySelector('.line-container') as HTMLElement;
        let newText = line.innerText;
        newText = newText.trim();
        newText = newText.replace(/(\r\n|\n|\r)/gm, "");
        const op: ArtefactEditLineOperation = new ArtefactEditLineOperation(
            this.editionId,
            firstChar,
            lastChar,
            newText,
            this.prevText
        );
        this.operationsManager.addOperation(op);
        this.checkText.replaceText(
            this.editionId,
            firstChar,
            lastChar,
            newText
        );
        const modal = this.$refs['editLineModal'] as any & { hide: () => void };
        modal.hide();
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
<style lang="scss">
.w-100-flex {
    width: 100% !important;
    display: flex;
    flex-direction: row;
}
.recontructedCheckbox{
    margin-left: 1rem;
}
</style>
