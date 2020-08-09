
import { SignInterpretation, InterpretationRoi } from '@/models/text';
import { StateManager } from '.';


function state() {
    return StateManager.instance;
}
export class ArtefactEditorState {
    public selectedSignsInterpretation: SignInterpretation[];
    public selectedInterpretationRois: InterpretationRoi[];
    constructor() {
        this.selectedSignsInterpretation = [];
        this.selectedInterpretationRois = [];
    }
    public get singleSelectedSi(): SignInterpretation | null {
        if (this.selectedSignsInterpretation.length === 1) {
            return this.selectedSignsInterpretation[0];
        }
        return null;
    }

    public toggleSelectSign(si: SignInterpretation | undefined, removeIfExist: boolean = true) {
        if (si && si.character) {

            const existingIdx = this.selectedSignsInterpretation.findIndex(x => x.id === si.id);
            if (existingIdx === -1) {
                this.selectedSignsInterpretation.push(si);
                this.addTextFragementToArtefact(si);
            } else if (removeIfExist) {
                this.selectedSignsInterpretation.splice(existingIdx, 1);
                this.removeTextFragementToArtefact(si);
            }
        }
    }
    public isSiSelected(si: SignInterpretation): boolean {
        return this.selectedSignsInterpretation.some(x => x.id === si.id);
    }

    private addTextFragementToArtefact(si: SignInterpretation) {
        const siTextFragment = si.sign.line.textFragment;
        const tf = state().artefacts.current!.textFragments.find(
            (x) => x.id === siTextFragment.textFragmentId
        );
        if (!tf) {
            state().artefacts.current!.textFragments.push({
                id: siTextFragment.textFragmentId,
                name: siTextFragment.textFragmentName,
                editorId: siTextFragment.editorId,
                certain: true,
            });
        } else {
            tf.certain = true;
        }
    }

    private removeTextFragementToArtefact(si: SignInterpretation) {
        const siTextFragment = si.sign.line.textFragment;
        const tfIndex = state().artefacts.current!.textFragments.findIndex(
            (x) => x.id === siTextFragment.textFragmentId
        );
        if (tfIndex > -1) {
            state().artefacts.current!.textFragments[tfIndex].certain = false;
            state().artefacts.current!.textFragments.splice(tfIndex, 1);
        }
    }
}
