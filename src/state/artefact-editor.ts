import { InterpretationAttributeDTO } from '@/dtos/sqe-dtos';
import { Artefact } from '@/models/artefact';
import { SignInterpretation, InterpretationRoi, ArtefactTextFragmentData } from '@/models/text';
import { StateManager } from '.';
import { ArtefactEditorParams } from '../views/artefact-editor/types';


function state() {
    return StateManager.instance;
}
export type editSignInterpretationModeType = 'edit' | 'create';
export class ArtefactEditorState {
    public selectedSignInterpretations: SignInterpretation[];
    public selectedInterpretationRoi: InterpretationRoi | null = null;
    public selectedAttribute: InterpretationAttributeDTO | null = null;
    public highlightCommentMode: boolean = false;
    public modeSignModal: editSignInterpretationModeType = 'edit';
    public params: ArtefactEditorParams| null = null;

    constructor() {
        this.params = new ArtefactEditorParams();
        this.selectedSignInterpretations = [];
    }

    public get singleSelectedSi(): SignInterpretation | null {
        if (this.selectedSignInterpretations.length === 1) {
            return this.selectedSignInterpretations[0];
        }
        return null;
    }
    protected get artefact() {
        return state().artefacts.current!;
    }

    public toggleSelectSign(si: SignInterpretation | undefined, removeIfExist: boolean = true) {
        if (si && si.character) {
            const existingIdx = this.selectedSignInterpretations.findIndex((x: SignInterpretation) => x.id === si.id);
            if (existingIdx === -1) {
                this.selectedSignInterpretations.push(si);
                this.addTextFragementToArtefact(si);
            } else if (removeIfExist) {
                this.selectedSignInterpretations.splice(existingIdx, 1);
                this.removeTextFragementToArtefact(si);
            }
            this.onSignInterpretationClicked();
        }
    }

    public selectSign(si?: SignInterpretation) {
        this.selectedSignInterpretations = si ? [si] : [];
    }

    public isSiSelected(si: SignInterpretation): boolean {
        return this.selectedSignInterpretations.some(x => x.id === si.id);
    }

    public selectRoi(roi: InterpretationRoi | null) {
        this.selectedInterpretationRoi = roi;

    }

    public addTextFragementToArtefact(si: SignInterpretation) {
        const siTextFragment = si.sign.line.textFragment;
        const tf = state().artefacts.current!.textFragments.find(
            (x: ArtefactTextFragmentData) => x.id === siTextFragment.textFragmentId
        );
        if (!tf) {
            state().artefacts.current!.textFragments.push(new ArtefactTextFragmentData({
                id: siTextFragment.textFragmentId,
                name: siTextFragment.textFragmentName,
                editorId: siTextFragment.editorId,
                suggested: true,
            }));
        } else {
            tf.certain = true;
        }
    }

    public removeTextFragementToArtefact(si: SignInterpretation) {
        const siTextFragment = si.sign.line.textFragment;
        const tfIndex = state().artefacts.current!.textFragments.findIndex(
            (x: ArtefactTextFragmentData) => x.id === siTextFragment.textFragmentId
        );
        if (tfIndex > -1) {
            state().artefacts.current!.textFragments[tfIndex].certain = false;
            state().artefacts.current!.textFragments.splice(tfIndex, 1);
        }
    }


    private onSignInterpretationClicked() {

        if (!this.singleSelectedSi) {
            this.selectRoi(null);
        } else if (this.selectedInterpretationRoi === null) {
            this.selectRoi(this.singleSelectedSi.artefactRoi(this.artefact) || null);
        }

    }
}
