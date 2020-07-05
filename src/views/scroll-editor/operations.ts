import { Operation } from '@/utils/operations-manager';
import { Artefact } from '@/models/artefact';
import { Placement } from '@/utils/Placement';
import { StateManager } from '@/state';
import ScrollArea from './scroll-area.vue';
import { group } from 'console';
import { ArtefactGroup, EditionInfo } from '@/models/edition';

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
        return this.artefactId;
    }

    public replaceEntityId(newId: number) {
        this.artefactId = newId;
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
export type GroupPlacementOperationType = 'delete' | 'placement' | 'edit';

export class GroupPlacementOperations implements Operation<GroupPlacementOperations> {
    public operations: ScrollEditorOperation[];
    public type: GroupPlacementOperationType;

    private get group(): ArtefactGroup | undefined {

        return state().editions.current!.artefactGroups.find(x => x.groupId === this.groupId);
    }
    public constructor(
        public groupId: number,
        operations: ScrollEditorOperation[],
        type: GroupPlacementOperationType = 'placement'

    ) {
        this.operations = operations;
        this.type = type;
    }


    public undo(): void {
        this.operations.forEach(
            op => op.undo()
        );
        if (this.type === 'delete') {
            // recreate the group with id 'this.groupId'
            const artefactIds = this.operations.map(artOp => artOp.getId());
            const removedGroup = new ArtefactGroup(artefactIds);
            removedGroup.groupId = this.groupId;
            // add the created group in store
            const group = state().editions.current!.artefactGroups.find(g => g.groupId === this.groupId);
            if (group) {
                group.artefactIds = [...artefactIds];
            }

            state().eventBus.$emit('select-group', this.group);
        }
    }

    public redo(): void {
        this.operations.forEach(
            op => op.redo()
        );
        if (this.type === 'delete') {
            state().eventBus.$emit('delete-group', this.groupId);
            state().eventBus.$emit('cancel-group');
        }
    }

    public uniteWith(op: PlacementOperation | GroupPlacementOperations): GroupPlacementOperations | undefined {
        if (op.type === 'placement') {
            (op as GroupPlacementOperations).operations.sort((a, b) => a.getId() > b.getId() ? 1 : -1);
            this.operations.sort((a, b) => a.getId() > b.getId() ? 1 : -1);

            const prevIds = (op as GroupPlacementOperations).operations.map(o => o.getId());
            const nextIds = this.operations.map(o => o.getId());

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

    public replaceEntityId(newId: number) {
        this.groupId = newId;
    }

}

export class EditGroupOperation implements Operation<EditGroupOperation> {

    private get group(): ArtefactGroup | undefined {

        return state().editions.current!.artefactGroups.find(x => x.groupId === this.groupId);
    }


    public prev: number[];
    public next: number[];
    public type: string = 'edit';

    public constructor(
        public groupId: number,
        prev: number[],
        next: number[]

    ) {
        this.prev = prev;
        this.next = next;
    }


    public undo(): void {
        this.group!.artefactIds = [...this.prev];
        state().eventBus.$emit('select-group',
            {
                groupId: this.groupId,
                artefactIds: [...this.prev]
            } as ArtefactGroup);
    }

    public redo(): void {
        this.group!.artefactIds = [...this.next];
        state().eventBus.$emit('select-group',
            {
                groupId: this.groupId,
                artefactIds: [...this.next]
            } as ArtefactGroup);
    }


    public uniteWith(op: EditGroupOperation): EditGroupOperation | undefined {
        return undefined;
    }

    public getId() {
        return this.groupId;
    }

    public replaceEntityId(newId: number) {
        this.groupId = newId;
    }
}

