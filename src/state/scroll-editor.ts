import { Artefact } from '@/models/artefact';
import { ArtefactGroup } from '@/models/edition';
import { SignInterpretation } from '@/models/text';
import { StateManager } from '@/state';
import { BoundingBox, Point } from '@/utils/helpers';
import { ScrollEditorParams } from '@/views/artefact-editor/types';
import { faGrinTongueSquint } from '@fortawesome/free-solid-svg-icons';


function state() {
    return StateManager.instance;
}

export type ScrollEditorMode = 'text' | 'material';
export class ScrollEditorState {
    private _selectedArtefact: Artefact | null = null;
    private _selectedGroup: ArtefactGroup | null = null;
    public viewport: BoundingBox | null = null;  // The viewport in edition coordinates
    public params: ScrollEditorParams| null = null;
    public pointerPosition: Point;
    public displayRois: boolean;
    public displayReconstructedText: boolean;
    public displayText: boolean;
    private _mode: ScrollEditorMode;

    public showEditReconTextBar: boolean =  false;

    public constructor() {
        this.params = new ScrollEditorParams();
        this.pointerPosition = {x: 0, y: 0};
        this.displayRois = false;
        this.displayReconstructedText = false;
        this.displayText = false;
        this._mode = 'material';

        this.showEditReconTextBar = false;
    }

    public get selectedArtefact() {
        return this._selectedArtefact;
    }

    public get selectedGroup() {
        return this._selectedGroup;
    }

    // Returns all selected artefacts - either as part of a group or not
    public get selectedArtefacts(): Artefact[] {
        let artefactIds: number[] = [];
        if (this.selectedGroup) {
            artefactIds = this.selectedGroup.artefactIds;
        } else if (this.selectedArtefact) {
            artefactIds = [this.selectedArtefact.id];
        }

        const artefacts: Artefact[] = [];
        for (const id of artefactIds) {
            const artefact = state().artefacts.find(id);
            if (artefact) {
                artefacts.push(artefact);
            }
        }
        return artefacts;
    }

    public selectArtefact(artefact: Artefact) {
        this._selectedArtefact = artefact;
        this._selectedGroup = null;
    }

    public selectGroup(artefactGroup: ArtefactGroup | undefined) {
        if (artefactGroup) {
            this._selectedGroup = artefactGroup.clone();
        } else {
            this._selectedGroup = null;
        }
        this._selectedArtefact = null;
    }

    public get mode() {
        return this._mode;
    }

    public set mode(val: ScrollEditorMode) {
        if (val === this._mode) {
            return;
        }

        // Undo all selections when switching modes
        this._selectedArtefact = null;
        this._selectedGroup = null;
        state().textFragmentEditor.selectedSignInterpretations = [];

        if (val === 'text') {
            this.displayReconstructedText = this.displayText = true;
            this.displayRois = false;
        }

        this._mode = val;
    }
}
