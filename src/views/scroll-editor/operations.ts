import { Operation } from '@/utils/operations-manager';
import { Artefact } from '@/models/artefact';
import { Placement } from '@/utils/Placement';
import { StateManager } from '@/state';
import ScrollArea from './scroll-area.vue';

function state() {
    return StateManager.instance;
}

export type ScrollEditorOperationType = 'translate' | 'scale' | 'rotate' | 'add' | 'delete' | 'z-index';

export abstract class ScrollEditorOperation implements Operation<ScrollEditorOperation> {
    public constructor(
        public artefactId: number,
        public type: ScrollEditorOperationType,
        public scrollAreaInstance?: ScrollArea
    ) { }

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

export class PlacementOperation extends ScrollEditorOperation {
    public prev: Placement;
    public next: Placement;

    public constructor(
        artefactId: number,
        type: ScrollEditorOperationType,
        prev: Placement,
        next: Placement,
        public scrollAreaInstance?: ScrollArea

    ) {
        super(artefactId, type, scrollAreaInstance);
        this.prev = prev.clone();
        this.next = next.clone();
    }


    public undo(): void {
        this.artefact.placement = this.prev.clone();
        this.artefact.isPlaced =
            this.artefact.placement.translate.x !== undefined
            && this.artefact.placement.translate.y !== undefined;
            debugger;
        if (this.scrollAreaInstance) {
            if (this.artefact.isPlaced) {
                this.scrollAreaInstance.selectArtefact(this.artefact);
            } else {
                this.scrollAreaInstance.selectArtefact(undefined);
            }

        }
    }

    public redo(): void {
        this.artefact.placement = this.next.clone();
        this.artefact.isPlaced =
            this.artefact.placement.translate.x !== undefined
            && this.artefact.placement.translate.y !== undefined;
        if (this.scrollAreaInstance) {
            if (this.artefact.isPlaced) {
                this.scrollAreaInstance.selectArtefact(this.artefact);
            } else {
                this.scrollAreaInstance.selectArtefact(undefined);
            }

        }
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
        return new PlacementOperation(this.artefactId, this.type, (op as PlacementOperation).prev, this.next);
    }

}

