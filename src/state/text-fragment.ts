import { InterpretationAttributeDTO } from '@/dtos/sqe-dtos';
import { SignInterpretation, InterpretationRoi, ArtefactTextFragmentData, TextFragment } from '@/models/text';
import { faGrinTongueSquint } from '@fortawesome/free-solid-svg-icons';
import { StateManager } from '.';
import { ArtefactEditorParams } from '../views/artefact-editor/types';


function state() {
    return StateManager.instance;
}
export type editSignInterpretationModeType = 'edit' | 'create';
export type TextEditingMode = 'manuscript' | 'artefact';
export class TextFragmentState {
    public selectedSignInterpretations: SignInterpretation[];
    public selectedAttribute: InterpretationAttributeDTO | null = null;
    public highlightCommentMode: boolean = false;
    public modeSignModal: editSignInterpretationModeType = 'edit';
    public textEditingMode: TextEditingMode = 'artefact'; // Provides an indication which module edits the text now

    constructor() {
        this.selectedSignInterpretations = [];
    }

    public get singleSelectedSi(): SignInterpretation | null {
        if (this.selectedSignInterpretations.length === 1) {
            return this.selectedSignInterpretations[0];
        }
        return null;
    }

    public get selectedTextFragment(): TextFragment | null {
        if (!this.selectedSignInterpretations.length) {
            return null;
        }

        return this.selectedSignInterpretations[0].sign.line.textFragment;
    }

    public toggleSelectSign(si: SignInterpretation | undefined, removeIfExist: boolean = true) {
        if (!si || !si.character) {
            return;
        }

        // Make sure only signs from one text fragment are selected
        if (si.sign.line.textFragment !== this.selectedTextFragment) {
            for (const oldSi of this.selectedSignInterpretations) {
                // Remove all the old signs
                this.removeTextFragementFromArtefact(oldSi);
            }

            this.selectedSignInterpretations = [si];
            this.addTextFragementToArtefact(si);
        } else {
            if (si && si.character) {
                const existingIdx = this.selectedSignInterpretations.findIndex((x: SignInterpretation) => x.id === si.id);
                if (existingIdx === -1) {
                    this.selectedSignInterpretations.push(si);
                    this.addTextFragementToArtefact(si);
                } else if (removeIfExist) {
                    this.selectedSignInterpretations.splice(existingIdx, 1);
                    this.removeTextFragementFromArtefact(si);
                }
                state().artefactEditor.onSignInterpretationSelected();
            }
        }
    }

    public selectSign(si: SignInterpretation | null) {
        this.selectedSignInterpretations = si ? [si] : [];
    }

    public isSiSelected(si: SignInterpretation): boolean {
        return this.selectedSignInterpretations.some(x => x.id === si.id);
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

    public removeTextFragementFromArtefact(si: SignInterpretation) {
        const siTextFragment = si.sign.line.textFragment;
        const tfIndex = state().artefacts.current!.textFragments.findIndex(
            (x: ArtefactTextFragmentData) => x.id === siTextFragment.textFragmentId
        );
        if (tfIndex > -1) {
            state().artefacts.current!.textFragments[tfIndex].certain = false;
            state().artefacts.current!.textFragments.splice(tfIndex, 1);
        }
    }}
