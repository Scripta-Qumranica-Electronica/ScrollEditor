import { Operation } from '@/utils/operations-manager';
import { Artefact } from '@/models/artefact';
import { Transformation } from '@/utils/Mask';
import { StateManager } from '@/state';

function state() {
    return StateManager.instance;
}

export type ScrollEditorOperationType = 'translate' | 'scale' | 'rotate' | 'add' | 'delete' | 'z-index';

export abstract class ScrollEditorOperation implements Operation<ScrollEditorOperation> {
    public constructor(public artefactId: number, public type: ScrollEditorOperationType) { }

    public abstract undo(): void;
    public abstract redo(): void;
    public abstract uniteWith(op: ScrollEditorOperation): ScrollEditorOperation | undefined;

    public getId(): number {
        return this.artefact.id;
    }
    protected get artefact(): Artefact {
        const artefact = state().artefacts.find(this.artefactId);
        if (!artefact) {
            console.error('Couldn\'t find artefact with id: ' + this.artefactId);
            throw new Error('Couldn\'t find artefact with id: ' + this.artefactId);
        }
        return artefact;
    }
}

export class TransformOperation extends ScrollEditorOperation {
    public prev: Transformation;
    public next: Transformation;

    public constructor(
        artefactId: number,
        type: ScrollEditorOperationType,
        prev: Transformation,
        next: Transformation,
    ) {
        super(artefactId, type);
        this.prev = prev.clone();
        this.next = next.clone();
    }


    public undo(): void {
        this.artefact.mask.transformation = this.prev.clone();
    }

    public redo(): void {
        this.artefact.mask.transformation = this.next.clone();

    }

    public uniteWith(op: ScrollEditorOperation): ScrollEditorOperation | undefined {
        // Unite operations of the same type
        if (op.type !== 'translate' && op.type !== 'rotate' && op.type !== 'scale') {
            return undefined;
        }

        if (op.artefactId !== this.artefactId || op.type !== this.type) {
            return undefined;
        }

        // Operations are of the same type on the same artefact, we can unite them
        return new TransformOperation(this.artefactId, this.type, (op as TransformOperation).prev, this.next);
    }


}


export class ZIndexOperation extends ScrollEditorOperation {


    public constructor(
        artefactId: number,
        type: ScrollEditorOperationType,
        public prevZIndex: number,
        public nextZIndex: number,
    ) {
        super(artefactId, type);
        if (type !== 'z-index') {
            throw Error('ZIndexOperation must accept a z-index type');
        }
    }


    public undo(): void {
        this.artefact.zOrder = this.prevZIndex;
    }

    public redo(): void {
        this.artefact.zOrder = this.nextZIndex;

    }

    public uniteWith(op: ScrollEditorOperation): ScrollEditorOperation | undefined {
        return undefined;
    }
}
