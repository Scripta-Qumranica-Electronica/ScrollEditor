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
    public selectedArtefact: Artefact | null = null;
    public selectedGroup: ArtefactGroup | null = null;
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
        this.selectedArtefact = artefact;
        this.selectedGroup = null;
    }

    public selectGroup(artefactGroup: ArtefactGroup | undefined) {
        if (artefactGroup) {
            this.selectedGroup = artefactGroup.clone();
        } else {
            this.selectedGroup = null;
        }
        this.selectedArtefact = null;
    }

    public get mode() {
        return this._mode;
    }

    public set mode(val: ScrollEditorMode) {
        if (val === this._mode) {
            return;
        }

        // Undo all selections when switching modes
        this.selectedArtefact = null;
        state().textFragmentEditor.selectedSignInterpretations = [];

        if (val === 'text') {
            this.displayReconstructedText = this.displayText = true;
            this.displayRois = false;
        }

        this._mode = val;
    }
}
