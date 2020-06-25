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
        public type: ScrollEditorOperationType
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
        next: Placement

    ) {
        super(artefactId, type);
        this.prev = prev.clone();
        this.next = next.clone();
    }


    public undo(): void {
        this.artefact.placement = this.prev.clone();
        this.artefact.isPlaced =
            this.artefact.placement.translate.x !== undefined
            && this.artefact.placement.translate.y !== undefined;
        if (this.artefact.isPlaced) {
            state().eventBus.$emit('select-artefact', this.artefact);
        } else {
            state().eventBus.$emit('select-artefact', undefined);
        }
    }

    public redo(): void {
        this.artefact.placement = this.next.clone();
        this.artefact.isPlaced =
            this.artefact.placement.translate.x !== undefined
            && this.artefact.placement.translate.y !== undefined;
        if (this.artefact.isPlaced) {
            state().eventBus.$emit('select-artefact', this.artefact);
        } else {
            state().eventBus.$emit('select-artefact', undefined);
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

export class GroupPlacementOperations implements Operation<GroupPlacementOperations> {
    public operations: ScrollEditorOperation[];
    public type: string = 'group';

    public constructor(
        public groupId: number,
        operations: ScrollEditorOperation[],

    ) {
        this.operations = operations;
    }


    public undo(): void {
        this.operations.forEach(
            op => op.undo()
        );
    }

    public redo(): void {
        this.operations.forEach(
            op => op.redo()
        );
    }

    public uniteWith(op: PlacementOperation | GroupPlacementOperations): GroupPlacementOperations | undefined {
        if (op.type === 'group') {
            (op as GroupPlacementOperations).operations.sort((a, b) => a.getId() > b.getId() ? 1 : -1);
            this.operations.sort((a, b) => a.getId() > b.getId() ? 1 : -1);

            const prevIds = (op as GroupPlacementOperations).operations.map(op => op.getId());
            const nextIds = this.operations.map(op => op.getId());

            const areSameArrays = prevIds.length === nextIds.length
                && prevIds.every((value, index) => value === nextIds[index]);

            if (areSameArrays) {
                const unitedOperations: Array<ScrollEditorOperation | undefined> = [];
                for (let i = 0; i < this.operations.length; i++) {
                    const united = this.operations[i].uniteWith((op as GroupPlacementOperations).operations[i]);
                    if (!united) {
                        return undefined;
                    }
                    unitedOperations.push(united);
                }

                return new GroupPlacementOperations(
                    this.getId(),
                    unitedOperations as ScrollEditorOperation[]);
            }

            return undefined;

        }
    }

    public getId() {
        return this.groupId;
    }

}


