import { Operation } from '@/utils/operations-manager';
import { Artefact } from '@/models/artefact';
import { Placement } from '@/utils/Placement';
import { StateManager } from '@/state';
import ScrollArea from './scroll-area.vue';
import { group } from 'console';
import { ArtefactGroup, EditionInfo } from '@/models/edition';
import { UpdateEditionManuscriptMetricsDTO } from '@/dtos/sqe-dtos';

function state() {
    return StateManager.instance;
}

export type ScrollEditorOperationCategory = 'artefact' | 'group' | 'edit-group' | 'edition-metrics';

export abstract class ScrollEditorOperation implements Operation<ScrollEditorOperation> {
    public constructor(public category: ScrollEditorOperationCategory) { }

    public abstract undo(): void;
    public abstract redo(): void;
    public abstract uniteWith(op: ScrollEditorOperation): ScrollEditorOperation | undefined;
    public abstract getId(): number;
    public abstract replaceEntityId(newId: number): void;
}

export type ArtefactPlacementOperationType = 'translate' | 'scale' | 'rotate' | 'add' | 'delete' | 'z-index';
export class ArtefactPlacementOperation extends ScrollEditorOperation {
    public prev: Placement;
    public next: Placement;
    public isPlacedPrev: boolean;
    public isPlacedNext: boolean;

    public constructor(
        public artefactId: number,
        public type: ArtefactPlacementOperationType,
        prev: Placement,
        next: Placement,
        isPlacedPrev: boolean,
        isPlacedNext: boolean

    ) {
        super('artefact');
        this.prev = prev.clone();
        this.next = next.clone();
        this.isPlacedPrev = isPlacedPrev;
        this.isPlacedNext = isPlacedNext;
    }


    public undo(): void {
        this.artefact.placement = this.prev.clone();
        this.artefact.isPlaced = this.isPlacedPrev;
        if (this.artefact.isPlaced) {
            state().eventBus.emit('select-artefact', this.artefact);
        } else {
            state().eventBus.emit('select-artefact', undefined);
        }
    }

    public redo(): void {
        this.artefact.placement = this.next.clone();
        this.artefact.isPlaced = this.isPlacedNext;
        if (this.artefact.isPlaced) {
            state().eventBus.emit('select-artefact', this.artefact);
        } else {
            state().eventBus.emit('select-artefact', undefined);
        }
    }

    public uniteWith(sop: ScrollEditorOperation): ArtefactPlacementOperation | undefined {
        if (!(sop instanceof ArtefactPlacementOperation)) {
            return undefined;
        }
        const op = sop as ArtefactPlacementOperation;

        // Unite operations of the same type
        if (op.type !== 'translate' && op.type !== 'rotate' && op.type !== 'scale') {
            return undefined;
        }

        if (op.artefactId !== this.artefactId || op.type !== this.type) {
            return undefined;
        }

        // Operations are of the same type on the same artefact, we can unite them
        return new ArtefactPlacementOperation(
            this.artefactId,
            this.type,
            (op as ArtefactPlacementOperation).prev,
            this.next,
            (op as ArtefactPlacementOperation).isPlacedPrev,
            this.isPlacedNext);
    }

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

export type GroupPlacementOperationType = 'delete' | 'placement' | 'edit';

export class GroupPlacementOperation extends ScrollEditorOperation {
    private get group(): ArtefactGroup {
        const groupArtefacts = state().editions.current!.artefactGroups.find(x => x.groupId === this.groupId);
        if (!groupArtefacts) {
            throw new Error('Couldn\'t find group with id:' + this.groupId);
        }
        return groupArtefacts;
    }

    public constructor(
        public groupId: number,
        public operations: ScrollEditorOperation[],
        public type: GroupPlacementOperationType = 'placement'

    ) {
        super('group');
        this.operations = operations;
        this.type = type;
    }


    public undo(): void {
        this.operations.forEach(
            op => op.undo()
        );
        if (this.type === 'delete') {
            this.type = 'placement';
            // recreate the group with id 'this.groupId'
            const artefactIds = this.operations.map(artOp => artOp.getId());
            const removedGroup = ArtefactGroup.generateGroup(artefactIds);
            state().editions.current!.artefactGroups.push(removedGroup);
            state().eventBus.emit('update-operation-id', this.groupId, removedGroup.id);
            this.groupId = removedGroup.id;

            state().eventBus.emit('select-group', removedGroup);
            state().eventBus.emit('save-group');

        }
    }

    public redo(): void {
        this.operations.forEach(
            op => op.redo()
        );

        if (this.type === 'placement' || this.type === 'delete') {
            this.type = 'delete';
            // Shaindel: Is there a place that documents all these events? There should be a list of
            // all the events, their parameters and what they are used for.
            state().eventBus.emit('delete-group', this.groupId);
            state().eventBus.emit('cancel-group');
        }

        const artefactIds = this.operations.map(artOp => artOp.getId());
        // if the edit was on an artefact, select the artefact
        if (artefactIds.length < 2) {
            const grp = ArtefactGroup.generateGroup(artefactIds);
            state().eventBus.emit('select-group', grp);
        }
    }

    public uniteWith(sop: ScrollEditorOperation): GroupPlacementOperation | undefined {
        if (!(sop instanceof GroupPlacementOperation)) {
            return undefined;
        }
        const op = sop as GroupPlacementOperation;
        if (op.type === 'placement') {
            // We need to compare the items (artefacts) in current operations to the ones in the previous operations
            // If the artefacts being edited are exactly the same as previous, unit them

            // First: sort the 2 arrays of operations by items id
            (op as GroupPlacementOperation).operations.sort((a, b) => a.getId() > b.getId() ? 1 : -1);
            this.operations.sort((a, b) => a.getId() > b.getId() ? 1 : -1);

            const prevIds = (op as GroupPlacementOperation).operations.map(o => o.getId());
            const nextIds = this.operations.map(o => o.getId());

            const areSameArrays = prevIds.length === nextIds.length
                && prevIds.every((value, index) => value === nextIds[index]);

            // If the items are the same in the current GroupOperations and the prev one
            // Try to unit each current operation with the previous one of the same item
            if (areSameArrays) {
                const unitedOperations: ScrollEditorOperation[] = [];
                for (let i = 0; i < this.operations.length; i++) {
                    const united = this.operations[i].uniteWith((op as GroupPlacementOperation).operations[i]);
                    if (!united) {
                        return undefined;
                    }
                    unitedOperations.push(united);
                }

                // if succeed to unit the operations, create a new GroupOperations with all united operations inside
                return new GroupPlacementOperation(this.getId(), unitedOperations);
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

// This type of operation allow to change items inside the group
// Undo a newly created group will result of removing all the artefacts in this group
export class EditGroupOperation extends ScrollEditorOperation {

    private get group(): ArtefactGroup {
        const groupArtefacts = state().editions.current!.artefactGroups.find(x => x.groupId === this.groupId);
        if (!groupArtefacts) {
            throw new Error('Couldn\'t find group with id:' + this.groupId);
        }
        return groupArtefacts;
    }
    public prev: number[];
    public next: number[];

    public constructor(
        public groupId: number,
        prev: number[],
        next: number[]

    ) {
        super('edit-group');
        this.prev = prev;
        this.next = next;
    }


    public undo(): void {
        this.group!.artefactIds = [...this.prev];
        state().eventBus.emit('select-group',
            {
                groupId: this.groupId,
                artefactIds: [...this.prev]
            } as ArtefactGroup);
    }

    public redo(): void {
        this.group!.artefactIds = [...this.next];
        state().eventBus.emit('select-group',
            {
                groupId: this.groupId,
                artefactIds: [...this.next]
            } as ArtefactGroup);
    }


    public uniteWith(op: ScrollEditorOperation): EditGroupOperation | undefined {
        return undefined;
    }

    public getId() {
        return this.groupId;
    }

    public replaceEntityId(newId: number) {
        this.groupId = newId;
    }
}

export class EditionMetricOperation extends ScrollEditorOperation {
    private static lastId: number = 1;

    private get edition(): EditionInfo {

        const edition = state().editions!.current;
        if (!edition) {
            throw new Error('Couldn\'t find editon with id:' + this.editionId);
        }
        return edition;
    }

    public prev: UpdateEditionManuscriptMetricsDTO;
    public next: UpdateEditionManuscriptMetricsDTO;
    private id: number;

    public constructor(
        public editionId: number,
        prev: UpdateEditionManuscriptMetricsDTO,
        next: UpdateEditionManuscriptMetricsDTO

    ) {
        super('edition-metrics');
        this.prev = prev;
        this.next = next;
        this.id = EditionMetricOperation.lastId++;
    }
    public uniteWith(op: ScrollEditorOperation): EditionMetricOperation | undefined {
        return undefined;
    }
    public getId() {
        return this.id;
    }

    public replaceEntityId(newId: number) {
        // The IDs are internal only and never get saved to the server. Since they mean nothing,
        // we never replace them.
    }

    public undo(): void {
        this.edition.metrics = { ...this.edition.metrics, ...this.prev };
    }
    public redo(): void {
        this.edition.metrics = { ...this.edition.metrics, ...this.next };
    }
}
