<template>
    <div>
        <b-modal ref="deleteLineModal" id="deleteLineModal" title="Delete Line">
            <div v-if="line">
                Are you sure you want to delete line {{ line.lineName }}
            </div>
            <template v-slot:modal-footer>
                <div class="w-100-flex">
                    <b-button variant="outline-primary" @click="deleteLine()"
                        >Confirm</b-button
                    >
                </div>
            </template>
        </b-modal>
    </div>
</template>

<script lang="ts">
import { Line, SignInterpretation, TextFragment } from '@/models/text';
import { Component, Prop, Vue, Watch } from 'vue-property-decorator';
import TextLine from '@/components/text/text-line.vue';
import TextService from '@/services/text';
import {
    ArtefactDeleteLineOperation,
    ArtefactEditorOperation
} from '@/views/artefact-editor/operations';
import { LineDTO, TextFragmentDTO } from '@/dtos/sqe-dtos';
import { OperationsManager } from '@/utils/operations-manager';

@Component({
    name: 'delete-line-modal',
    components: {
        'text-line': TextLine
    }
})
export default class DeleteLineModal extends Vue {
    // if line.lineId is undefined the linelineName will be bad
    public position: string = '';
    public tempLine: LineDTO = {
        lineId: 0,
        lineName: '',
        signs: [],
        editorId: 0
    };
    public get editionId() {
        return parseInt(this.$route.params.editionId);
    }
    public notInTheRightComponent: boolean = false;
    public textService: TextService = new TextService();
    public previousLineId: number = 0;
    public subsequentLineId: number = 0;
    public textFragmentId: number = 0;
    private operationsManager = new OperationsManager<ArtefactEditorOperation>(
        this
    );
    public textLine: string = '';
    public get editorState() {
        return this.$state.textFragmentEditor;
    }
    public get selectedSignInterpretation(): SignInterpretation {
        return this.editorState.selectedSignInterpretations[0];
    }
    protected async mounted() {
        this.$root.$on(
            'bv::show::modal',
            (modalId: string, parameter: string) => {
                if (modalId === 'deleteLineModal') {
                } else {
                    this.notInTheRightComponent = true;
                }
            }
        );
        this.$state.operationsManager = this.operationsManager;
    }
    public async saveEntities(
        ops: ArtefactEditorOperation[]
    ): Promise<boolean> {
        return true;
    }
    protected async created() {
        // check what with line.lineId
        this.$state.eventBus.on(
            'change-artefact-delete-line',
            (prevText: Line) => {
                console.log(this.line, prevText);
            }
        );
    }
    public get line(): LineDTO {
        //tqke cqre if it is before or after here 
        if (this.notInTheRightComponent) {
            const line: any = {
                editorId: this.selectedSignInterpretation?.sign.line.editorId,
                lineName: this.selectedSignInterpretation?.sign.line.lineName,
                lineId: this.selectedSignInterpretation?.sign.line.lineId,
                signs: this.selectedSignInterpretation?.sign.line.signs
            };
            return this.selectedSignInterpretation && line;
        } else {
            const index: string = this.selectedSignInterpretation?.sign.line
                .lineName; // line we clicked on
            const textFragment: TextFragment = this.selectedSignInterpretation
                ?.sign.line.textFragment;
            const line: any = {
                editorId: this.selectedSignInterpretation?.sign.line.editorId,
                lineName: this.selectedSignInterpretation?.sign.line.lineName,
                lineId: this.selectedSignInterpretation?.sign.line.lineId,
                signs: []
            };
            this.textFragmentId = textFragment?.textFragmentId;
            for (
                let i = 0;
                i <
                this.selectedSignInterpretation?.sign.line.textFragment.lines
                    .length;
                i++
            ) {
                if (
                    this.selectedSignInterpretation?.sign.line.textFragment
                        .lines[i].lineName === index
                ) {
                    // in case we clicked on after 
                    // get the previous and the subsequent 
                    this.previousLineId = this.selectedSignInterpretation?.sign.line.textFragment.lines[
                        i
                    ].lineId;
                    this.subsequentLineId = this.selectedSignInterpretation?.sign.line.textFragment.lines[
                        i + 1
                    ].lineId;
                }
            }
            return this.selectedSignInterpretation && line;
        }
    }
    public deleteLine() {

        this.textService.deleteLine(this.editionId, this.line.lineId);
        const op: ArtefactDeleteLineOperation = new ArtefactDeleteLineOperation(
            this.editionId,
            this.line,
            this.textFragmentId,
            this.previousLineId,
            this.subsequentLineId
        );
        this.operationsManager.addOperation(op);
        const modal = this.$refs['deleteLineModal'] as any & {
            hide: () => void;
        };
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
.recontructedCheckbox {
    margin-left: 1rem;
}
</style>
