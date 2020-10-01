import { Operation } from '@/utils/operations-manager';
import { Artefact } from '@/models/artefact';
import { Placement } from '@/utils/Placement';
import { StateManager } from '@/state';
import { Polygon } from '@/utils/Polygons';
import { InterpretationRoi, SignInterpretation } from '@/models/text';
import ArtefactEditor from './artefact-editor.vue';
import { InterpretationAttributeDTO } from '@/dtos/sqe-dtos';
import Vue from 'vue';

function state() {
    return StateManager.instance;
}

export type ArtefactEditorOperationType = 'rotate' | 'draw' | 'erase' | 'attr';


export abstract class ArtefactEditorOperation implements Operation<ArtefactEditorOperation> {
    public constructor(
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
            console.error("There is no current artefact - can't perform artefact operation!");
            throw new Error("There is no current artefact - can't perform artefact operation!");
        }
        return artefact;
    }
}

export class ArtefactRotateOperation extends ArtefactEditorOperation {
    public prev: number;
    public next: number;

    public constructor(
        prev: number,
        next: number
    ) {
        super('rotate');
        this.prev = prev;
        this.next = next;
    }

    public undo(): void {
        state().eventBus.emit('change-artefact-rotation', this.prev);
        // this.artefactEditorInstance.params.rotationAngle = this.prev;
    }

    public redo(): void {
        state().eventBus.emit('change-artefact-rotation', this.next);

        // this.artefactEditorInstance.params.rotationAngle = this.next;
    }

    public uniteWith(op: ArtefactEditorOperation): ArtefactEditorOperation | undefined {
        // Unite operations of the same type
        if (op.type !== 'rotate') {
            return undefined;
        }

        if (op.type !== this.type) {
            return undefined;
        }

        // Operations are of the same type on the same artefact, we can unite them
        return new ArtefactRotateOperation(
            (op as ArtefactRotateOperation).prev,
            this.next
        );
    }


}

export class ArtefactROIOperation extends ArtefactEditorOperation {

    public constructor(
        type: ArtefactEditorOperationType,
        public roi: InterpretationRoi
        // public artefactEditorInstance: ArtefactEditor
        // public prev: ArtefactEditorStatus,
        // public next: ArtefactEditorStatus
    ) {
        super(type);
        this.roi = roi.clone();
    }

    public undo(): void {
        if (this.type === 'draw') {
            state().eventBus.emit('remove-roi', this.roi);
            // this.artefactEditorInstance.removeRoi(this.roi);
        } else {
            // Restore status to previous status - it should no longer be deleted
            state().eventBus.emit('place-roi', this.roi);
            // this.artefactEditorInstance.placeRoi(this.roi);
        }
    }

    public redo(): void {
        if (this.type === 'draw') {
            state().eventBus.emit('place-roi', this.roi);
            //  this.artefactEditorInstance.placeRoi(this.roi);
        } else {
            // Restore status to previous status - it should no longer be deleted
            // this.artefactEditorInstance.removeRoi(this.roi);
            state().eventBus.emit('remove-roi', this.roi);
        }
    }

    public uniteWith(op: ArtefactEditorOperation): ArtefactEditorOperation | undefined {
        return undefined;
    }

}

export type TextFragmentAttributeOperationType = 'create' | 'update' | 'delete';

export class TextFragmentAttributeOperation extends ArtefactEditorOperation {
    public prev?: InterpretationAttributeDTO;

    public constructor(
        public signInterpretationId: number,
        public attributeValueId: number, // In case of an update of the valueId, this holds the valueId before the change
        public next?: InterpretationAttributeDTO
    ) {
        super('attr');
        this.prev = this.signInterpretation.attributes.find(attr => attr.attributeValueId === attributeValueId);
    }

    private get signInterpretation() {
        return state().signInterpretations.get(this.signInterpretationId)!;
    }

    public get attributeOperationType(): TextFragmentAttributeOperationType {
        if (this.prev && this.next) {
            return 'update';
        } else if (this.prev) {
            return 'delete';
        } else {
            return 'create';
        }
    }
    public uniteWith(op: ArtefactEditorOperation): ArtefactEditorOperation | undefined {
        if (op.type !== 'attr') {
            return undefined;
        }

        const other = op as TextFragmentAttributeOperation;
        if (other.signInterpretation.id !== this.signInterpretation.id || other.attributeValueId !== this.attributeValueId) {
            return undefined;
        }

        const united = new TextFragmentAttributeOperation(this.signInterpretation.id, this.attributeValueId, this.next);
        united.prev = other.prev;

        return united;
    }

    public undo() {
        // In an update, the attributeValueId might change. In that case, we get the *next* attributeValueId, which is the new ID.
        // In other cases, there is only one attributeValueId, so we can take it from `this`.
        const existingIndex = this.signInterpretation.findAttributeIndex(this.attributeOperationType === 'update' ? this.next!.attributeValueId : this.attributeValueId);

        if (!this.prev) {
            if (existingIndex !== -1) {
                console.debug('Undoing new attribute, removing item from index ', existingIndex);
                this.signInterpretation.attributes.splice(existingIndex, 1);
            } else {
                console.warn("Can't undo operation with no prev and no existing index");
            }
        } else {
            if (existingIndex !== -1) {
                console.debug('Undoing update, setting index ', existingIndex, ' to ', this.prev, this.prev.commentary?.commentary);
                Vue.set(this.signInterpretation.attributes, existingIndex, this.prev);
            } else {
                console.debug('Undoing deletion, pushing ', this.prev, this.prev.commentary?.commentary);
                this.signInterpretation.attributes.push(this.prev);
            }
        }
    }

    public redo() {
        const existingIndex = this.signInterpretation.findAttributeIndex(this.attributeValueId); // In case of an update, this finds the previous attribute

        if (this.next) {
            if (existingIndex !== -1) {
                console.debug('Redoing update ', this.next, this.next.commentary?.commentary);
                Vue.set(this.signInterpretation.attributes, existingIndex, this.next);
            } else {
                console.debug('Redoing create ', this.next, this.next.commentary?.commentary);
                this.signInterpretation.attributes.push(this.next);
            }
        } else {
            if (existingIndex !== -1) {
                console.debug('Redoing deletion, Deleting from index ', existingIndex);
                this.signInterpretation.attributes.splice(existingIndex, 1);
            } else {
                console.warn("Can't redo operation with no next and no existingIndex");
            }
        }
    }
}

