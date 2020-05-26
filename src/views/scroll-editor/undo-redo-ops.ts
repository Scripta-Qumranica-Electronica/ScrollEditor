import { Operation } from '@/utils/undo-redo';
import { Artefact } from '@/models/artefact';
import { Transformation } from '@/utils/Mask';

export type ScrollEditorOperationType = 'translate' | 'scale' | 'rotate' | 'add' | 'delete';

export class ScrollEditorOperation implements Operation {
    public prev: Transformation;
    public next: Transformation;

    public constructor(public artefact: Artefact,
                       public type: ScrollEditorOperationType,
                       prev: Transformation,
                       next: Transformation) {
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

        if (op.artefact !== this.artefact || op.type !== this.type) {
            return undefined;
        }

        // Operations are of the same type on the same artefact, we can unite them
        return new ScrollEditorOperation(this.artefact, this.type, op.prev, this.next);
    }
}
