<template @modal-show="onModalShow">
    <div>
        <b-modal ref="addLineModal" id="addLineModal" title="Add Line">
            <!-- <div ref="addLineModalRef">
                <text-line :line="line"></text-line>
            </div> -->
            <div v-if="line && line.lineName">
                Do you want to add line #      
                      <input
                :value="line.lineName"
                @input="event => onLineNamed(event.target.value)"
            />
            </div>
            <div v-else>
                Please name the line you want to add  
                          <input
                @input="event => onLineNamed(event.target.value)"
            />
            </div>


            <!-- <input style="background-color:blue" value="222" v-else @input="event => onLineNamed(event.target.value)"/> -->

            <template v-slot:modal-footer>
                <div class="w-100-flex">
                    <b-button variant="outline-primary" @click="saveNewLine()"
                        >Save</b-button
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
    ArtefactAddLineOperation,
    ArtefactEditorOperation
} from '@/views/artefact-editor/operations';
import { LineDTO, TextFragmentDTO } from '@/dtos/sqe-dtos';
import { OperationsManager } from '@/utils/operations-manager';

@Component({
    name: 'add-line-modal',
    components: {
        'text-line': TextLine
    }
})
export default class AddLineModal extends Vue {
    public position: string = '';
    public notInTheRightComponent: boolean = false;
    public tempLine: LineDTO = {
        lineId: 0,
        lineName: '',
        signs: [],
        editorId: 0
    };
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
    public onModalShow(parameter: any) {
        console.log(parameter);
    }
    protected async mounted() {
        this.$root.$on(
            'bv::show::modal',
            (modalId: string, parameter: string) => {
                if (modalId === 'addLineModal') {
                    this.position = parameter;
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
    public onLineNamed(name: string) {
        this.line.lineName = name;
    }
    protected async created() {
        this.$state.eventBus.on(
            'change-artefact-add-line',
            (prevText: Line) => {
                console.log(this.line, prevText);
            }
        );
    }
    public updateLineName(index: string, textFragment: TextFragment) {
        if (textFragment) {
            // first one before
            // last one after
            // others
            let name: string = '';
            for (let i = 0; i < textFragment?.lines.length; i++) {
                if (textFragment?.lines[i].lineName === index) {
                    if (!index.includes('_')) {
                        if (this.position === 'before') {
                            const before = Number(index) - 1;
                            name = before.toString() + '_' + 1;
                        } else {
                            name = index + '_' + '1';
                        }
                    } else {
                        name = '';
                    }
                }
            }
            return name;
        }
    }
    public get line(): LineDTO {
        // when it enters addline without reason
        if (this.notInTheRightComponent) {
            const line: any = {
                editorId: this.selectedSignInterpretation?.sign.line.editorId,
                lineName: this.selectedSignInterpretation?.sign.line.lineName,
                lineId: this.selectedSignInterpretation?.sign.line.lineId,
                signs: this.selectedSignInterpretation?.sign.line.signs
            };
            return this.selectedSignInterpretation && line;
        } else {
            debugger
            // creating new line with negativ id + name updated
            const index: string = this.selectedSignInterpretation?.sign.line
                .lineName;
            const textFragment: TextFragment = this.selectedSignInterpretation
                ?.sign.line.textFragment;
            const line: any = {
                editorId: this.selectedSignInterpretation?.sign.line.editorId,
                lineName: this.updateLineName(index, textFragment),
                lineId: -1,
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
                        // we clicked on the line 
                )
                 {
                    if (
                        Number(index) !==
                        this.selectedSignInterpretation?.sign.line.textFragment
                            .lines.length // we are not the last one
                    ) {
                        // separate this in 2
                        // if we clkicked on after
                        // if we clicked on before 
                        if (this.position == 'after'){                        this.previousLineId = this.selectedSignInterpretation?.sign.line.textFragment.lines[
                            i
                        ].lineId;
                        this.subsequentLineId = this.selectedSignInterpretation?.sign.line.textFragment.lines[
                            i + 1
                        ].lineId;}
                        else{
                            this.previousLineId = this.selectedSignInterpretation?.sign.line.textFragment.lines[
                            i -1
                        ].lineId;
                        this.subsequentLineId = this.selectedSignInterpretation?.sign.line.textFragment.lines[
                            i 
                        ].lineId;
                        }

                    } else {
                        this.previousLineId = this.selectedSignInterpretation?.sign.line.textFragment.lines[
                            i
                        ].lineId;
                        this.subsequentLineId = 0; // chqnge this to null
                    }
                }
            }
            debugger
            return this.selectedSignInterpretation && line;
        }
    }

    public saveNewLine() {
        // call the operation

        this.textService.createLine(
            this.line,
            this.textFragmentId,
            this.previousLineId,
            this.subsequentLineId
        );
        const op: ArtefactAddLineOperation = new ArtefactAddLineOperation(
            this.line,
            this.textFragmentId,
            this.previousLineId,
            this.subsequentLineId
        );
        this.operationsManager.addOperation(op);
        const modal = this.$refs['addLineModal'] as any & { hide: () => void };
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
