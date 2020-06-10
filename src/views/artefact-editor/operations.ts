import { Operation } from '@/utils/operations-manager';
import { Artefact } from '@/models/artefact';
import { Transformation } from '@/utils/Mask';
import { StateManager } from '@/state';
import { Polygon } from '@/utils/Polygons';
import { InterpretationRoi, SignInterpretation } from '@/models/text';
import ArtefactEditor from './artefact-editor.vue';

function state() {
    return StateManager.instance;
}

// export class ArtefactEditorStatus {
//     public constructor(
//         public selectedSI: SignInterpretation | null,
//         public selectedROI: InterpretationRoi | null
//     ) { }
// }

export type ArtefactEditorOperationType = 'rotate' | 'draw' | 'erase';


export abstract class ArtefactEditorOperation implements Operation<ArtefactEditorOperation> {
    public constructor(public artefactId: number, public type: ArtefactEditorOperationType) { }

    public abstract undo(): void;
    public abstract redo(): void;
    public abstract uniteWith(op: ArtefactEditorOperation): ArtefactEditorOperation | undefined;

    public getId(): number {
        return this.artefact.id;
    }

    protected get artefact(): Artefact {
        const artefact = state().artefacts.current;
        if (!artefact) {
            console.error('Couldn\'t find artefact with id: ' + this.artefactId);
            throw new Error('Couldn\'t find artefact with id: ' + this.artefactId);
        }
        return artefact;
    }
}

export class ArtefactRotateOperation extends ArtefactEditorOperation {
    public prev: number;
    public next: number;

    public constructor(
        artefactId: number,
        prev: number,
        next: number,
    ) {
        super(artefactId, 'rotate');
        this.prev = prev;
        this.next = next;
    }

    public undo(): void {
        this.artefact.mask.transformation.rotate = this.prev;
    }

    public redo(): void {
        this.artefact.mask.transformation.rotate = this.next;
    }

    public uniteWith(op: ArtefactEditorOperation): ArtefactEditorOperation | undefined {
        // Unite operations of the same type
        if (op.type !== 'rotate') {
            return undefined;
        }

        if (op.artefactId !== this.artefactId || op.type !== this.type) {
            return undefined;
        }

        // Operations are of the same type on the same artefact, we can unite them
        return new ArtefactRotateOperation(
            this.artefactId,
            (op as ArtefactRotateOperation).prev,
            this.next
        );
    }

}

export class ArtefactROIOperation extends ArtefactEditorOperation {

    public constructor(
        artefactId: number,
        type: ArtefactEditorOperationType,
        public roi: InterpretationRoi,
        public artefactEditorInstance: ArtefactEditor
        // public prev: ArtefactEditorStatus,
        // public next: ArtefactEditorStatus
    ) {
        super(artefactId, type);
    }

    public undo(): void {
        if (this.type === 'draw') {
            this.artefactEditorInstance.removeRoi(this.roi);
        } else {
            // Restore status to previous status - it should no longer be deleted
            this.artefactEditorInstance.placeRoi(this.roi);
        }
    }

    public redo(): void {
        if (this.type === 'draw') {
            this.artefactEditorInstance.placeRoi(this.roi);
        } else {
            // Restore status to previous status - it should no longer be deleted
            this.artefactEditorInstance.removeRoi(this.roi);
        }
    }

    public uniteWith(op: ArtefactEditorOperation): ArtefactEditorOperation | undefined {
        return undefined;
    }

}


