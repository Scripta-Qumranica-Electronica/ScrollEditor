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

export class PlacementOperation extends ScrollEditorOperation {  // Shaindel: Rename to ArtefactPlacementOperation
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
        // Shaindel: Do not return undefined - if the group is undefined this is a bug (so throw an exception)
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
            const removedGroup = ArtefactGroup.generateGroup(artefactIds);
            // removedGroup.groupId = this.groupId;
            // add the created group in store
            // const group = state().editions.current!.artefactGroups.find(group => group.groupId === this.groupId);
            // if (group) {
            //     group.artefactIds = [...artefactIds];
            // }
            state().editions.current!.artefactGroups.push(removedGroup);
            this.groupId = removedGroup.id; 
            // Shaindel: what happens if the group has an ID of 3, I delete the group and then
            // undo the deletion before saveEntities is called? The server will still have a group
            // ID of 3, and also try to save a new group with the same artefact IDs.
            // I think this should be different - do not change the group's ID at all here, instead, change
            // it from a positive number to a negative number after deleting the group in the server
            // so the delete operation will fire an `update-operation-id` event, to change the ID to
            // a negative number
            state().eventBus.$emit('update-operation-id', this.groupId, removedGroup.id);
            state().eventBus.$emit('select-group', removedGroup);
        }
    }

    public redo(): void {
        this.operations.forEach(
            op => op.redo()
        );

        if (this.type === 'delete') {
            // Shaindel: Is there a place that documents all these events? There should be a list of
            // all the events, their parameters and what they are used for.
            state().eventBus.$emit('delete-group', this.groupId);
            state().eventBus.$emit('cancel-group');
        }

        const artefactIds = this.operations.map(artOp => artOp.getId());
        // if the edit was on an artefact, select the artefact
        if (artefactIds.length < 2) {
            const group = ArtefactGroup.generateGroup(artefactIds);
            state().eventBus.$emit('select-group', group);
        }
    }

    public uniteWith(op: PlacementOperation | GroupPlacementOperations): GroupPlacementOperations | undefined {
        if (op.type === 'placement') {
            // Shaindel - add comments, it's not clear what this does.
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
    // Shaindel - add a comment - which kind of operation is this? How is this
    // different from GroupPlacementOperation with a type of edit?
    
    private get group(): ArtefactGroup | undefined {
        // Shaindel - this, too, shouldn't return undefined ever. It should throw an exception if
        // the group is not found, as this is glearly a bug
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

