import { Artefact } from '@/models/artefact';
import { ArtefactGroup } from '@/models/edition';
import { StateManager } from '@/state';
import { BoundingBox } from '@/utils/helpers';


function state() {
    return StateManager.instance;
}
export class ScrollEditorState {
    public selectedArtefact: Artefact | null = null;
    public selectedGroup: ArtefactGroup| null = null;

    // constructor() {
    //     this.selectedArtefact = undefined;
    //     this.selectedGroup = undefined;
    // }

    public get selectedArtefacts(): Array<Artefact | undefined> {
        let artefactsIds: number[] = [];
        if (this.selectedGroup) {
            artefactsIds = this.selectedGroup.artefactIds;
        } else if (this.selectedArtefact) {
            artefactsIds = [this.selectedArtefact.id];
        }

        return artefactsIds.map((x: number) =>
            state().artefacts.find(x)
        );
    }

    public selectArtefact(artefact: Artefact) {
        this.selectedArtefact = artefact;
        this.selectedGroup = undefined;
    }

    public selectGroup(artefactGroup: ArtefactGroup | undefined) {
        this.selectedGroup = artefactGroup && artefactGroup.clone();
        this.selectedArtefact = undefined;
    }


    public viewport: BoundingBox | null = null;  // The viewport in edition coordinates

}
