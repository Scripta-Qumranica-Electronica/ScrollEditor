import { InterpretationAttributeDTO } from '@/dtos/sqe-dtos';
import { Artefact } from '@/models/artefact';
import { SignInterpretation, InterpretationRoi, ArtefactTextFragmentData } from '@/models/text';
import { StateManager } from '.';
import { ArtefactEditorParams } from '../views/artefact-editor/types';


function state() {
    return StateManager.instance;
}
export class ArtefactEditorState {
    public selectedInterpretationRoi: InterpretationRoi | null = null;
    public highlightCommentMode: boolean = false;
    public params: ArtefactEditorParams | null = null;

    constructor() {
        this.params = new ArtefactEditorParams();
    }

    protected get artefact() {
        return state().artefacts.current!;
    }

    public selectRoi(roi: InterpretationRoi | null) {
        this.selectedInterpretationRoi = roi;

    }

    public onSignInterpretationSelected() {
        if (!state().textFragmentEditor.singleSelectedSi) {
            this.selectRoi(null);
        } else if (this.selectedInterpretationRoi === null) {
            this.selectRoi(state().textFragmentEditor.singleSelectedSi?.artefactRoi(this.artefact) || null);
        }
    }
}
