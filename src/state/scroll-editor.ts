import { Artefact } from '@/models/artefact';
import { ArtefactGroup } from '@/models/edition';
import { StateManager } from '@/state';
import { BoundingBox, Point } from '@/utils/helpers';
import { ScrollEditorParams } from '@/views/artefact-editor/types';


function state() {
    return StateManager.instance;
}
export class ScrollEditorState {
    public selectedArtefact: Artefact | null = null;
    public selectedGroup: ArtefactGroup | null = null;
    public viewport: BoundingBox | null = null;  // The viewport in edition coordinates
    public params: ScrollEditorParams| null = null;
    public pointerPosition: Point;
    public displayRois: boolean;
    public displayReconstructedText: boolean;

    public constructor() {
        this.params = new ScrollEditorParams();
        this.pointerPosition = {x: 0, y: 0};
        this.displayRois = false;
        this.displayReconstructedText = false;
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
}
