import { Operation } from '@/utils/operations-manager';
import { Artefact } from '@/models/artefact';
import { Placement } from '@/utils/Placement';
import { StateManager } from '@/state';
import { Polygon } from '@/utils/Polygons';
import { InterpretationRoi, SignInterpretation } from '@/models/text';
import ArtefactEditor from './artefact-editor.vue';

function state() {
    return StateManager.instance;
}

export type ArtefactEditorOperationType = 'rotate' | 'draw' | 'erase';


export abstract class ArtefactEditorOperation implements Operation<ArtefactEditorOperation> {
    public constructor(
        public artefactId: number,
        public type: ArtefactEditorOperationType
    ) { }

    public abstract undo(): void;
    public abstract redo(): void;
    public abstract uniteWith(op: ArtefactEditorOperation): ArtefactEditorOperation | undefined;

    public getId(): number {
        return this.artefact.id;
    }
    public replaceEntityId(newId: number) {
        this.artefact.id = newId;
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
        next: number
    ) {
        super(artefactId, 'rotate');
        this.prev = prev;
        this.next = next;
    }

    public undo(): void {
        state().eventBus.$emit('change-artefact-rotation', this.prev);
        // this.artefactEditorInstance.params.rotationAngle = this.prev;
    }

    public redo(): void {
        state().eventBus.$emit('change-artefact-rotation', this.next);

        // this.artefactEditorInstance.params.rotationAngle = this.next;
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
            // this.artefactEditorInstance,
        );
    }


}

export class ArtefactROIOperation extends ArtefactEditorOperation {

    public constructor(
        artefactId: number,
        type: ArtefactEditorOperationType,
        public roi: InterpretationRoi
        // public artefactEditorInstance: ArtefactEditor
        // public prev: ArtefactEditorStatus,
        // public next: ArtefactEditorStatus
    ) {
        super(artefactId, type);
        this.roi = roi.clone();
    }

    public undo(): void {
        if (this.type === 'draw') {
            state().eventBus.$emit('remove-roi', this.roi);
            // this.artefactEditorInstance.removeRoi(this.roi);
        } else {
            // Restore status to previous status - it should no longer be deleted
            state().eventBus.$emit('place-roi', this.roi);
            // this.artefactEditorInstance.placeRoi(this.roi);
        }
    }

    public redo(): void {
        if (this.type === 'draw') {
            state().eventBus.$emit('place-roi', this.roi);
            //  this.artefactEditorInstance.placeRoi(this.roi);
        } else {
            // Restore status to previous status - it should no longer be deleted
            // this.artefactEditorInstance.removeRoi(this.roi);
            state().eventBus.$emit('remove-roi', this.roi);
        }
    }

    public uniteWith(op: ArtefactEditorOperation): ArtefactEditorOperation | undefined {
        return undefined;
    }

}


