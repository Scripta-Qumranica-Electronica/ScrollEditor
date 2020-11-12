import { Operation } from '@/utils/operations-manager';
import { Artefact } from '@/models/artefact';
import { StateManager } from '@/state';
import { InterpretationRoi, Sign, SignInterpretation } from '@/models/text';
import { InterpretationAttributeDTO } from '@/dtos/sqe-dtos';
import Vue from 'vue';
import { NumberFormatResult } from 'vue-i18n';

function state() {
    return StateManager.instance;
}

export type ArtefactEditorOperationType = 'rotate' | 'draw' | 'erase' | 'attr' | 'commentary' | 'sign';


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
        public roi: InterpretationRoi,
    ) {
        super(type);
        this.roi = roi.clone();
    }

    public undo(): void {
        if (this.type === 'draw') {
            this.removeRoi();
        } else {
            this.placeRoi();
        }
    }

    public redo(): void {
        if (this.type === 'draw') {
            this.placeRoi();
        } else {
            this.removeRoi();
        }
    }

    public uniteWith(op: ArtefactEditorOperation): ArtefactEditorOperation | undefined {
        return undefined;
    }

    private placeRoi() {
        state().interpretationRois.put(this.roi);
        this.roi.status = 'new';
        const si = state().signInterpretations.get(
            this.roi.signInterpretationId!
        );
        if (si) {
            si.rois.push(this.roi);
        }
        state().eventBus.emit('roi-changed', this.roi);
    }

    private removeRoi() {
        let inState = state().interpretationRois.get(this.roi.id);
        if (!inState) {
            const newId = state().interpretationRois.getServerId(this.roi.id);

            if (newId) {
                inState = state().interpretationRois.get(newId);
            }
        }

        if (!inState) {
            console.error("Can't remove ROI which isn't in the state!");
            return;
        }

        inState.status = 'deleted';
        const si = state().signInterpretations.get(this.roi.signInterpretationId!);
        if (si) {
            si.deleteRoi(this.roi);
        }
        state().eventBus.emit('roi-changed', inState);
        state().eventBus.emit('remove-roi', inState);
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
                this.signInterpretation.attributes.splice(existingIndex, 1);
            } else {
                console.warn("Can't undo operation with no prev and no existing index");
            }
        } else {
            if (existingIndex !== -1) {
                Vue.set(this.signInterpretation.attributes, existingIndex, this.prev);
            } else {
                this.signInterpretation.attributes.push(this.prev);
            }
        }
    }

    public redo() {
        const existingIndex = this.signInterpretation.findAttributeIndex(this.attributeValueId); // In case of an update, this finds the previous attribute

        if (this.next) {
            if (existingIndex !== -1) {
                Vue.set(this.signInterpretation.attributes, existingIndex, this.next);
            } else {
                this.signInterpretation.attributes.push(this.next);
            }
        } else {
            if (existingIndex !== -1) {
                this.signInterpretation.attributes.splice(existingIndex, 1);
            } else {
                console.warn("Can't redo operation with no next and no existingIndex");
            }
        }
    }
}

export class SignInterpretationCommentOperation extends ArtefactEditorOperation {
    public signInterpretationId: number;
    public prevComment: string | null;
    public nextComment: string | null;

    public constructor(signInterpretationId: number, comment: string | null) {
        super('commentary');
        this.signInterpretationId = signInterpretationId;
        this.nextComment = comment;
        this.prevComment = this.signInterpretation.commentary;
    }

    private get signInterpretation() {
        return state().signInterpretations.get(this.signInterpretationId)!;
    }

    public undo() {
        this.signInterpretation.commentary = this.prevComment;
    }

    public redo() {
        this.signInterpretation.commentary = this.nextComment;
    }

    public uniteWith(op: ArtefactEditorOperation): ArtefactEditorOperation | undefined {
        if (op.type !== 'commentary') {
            return undefined;
        }

        const other = op as SignInterpretationCommentOperation;
        if (other.signInterpretationId !== this.signInterpretationId) {
            return undefined;
        }

        const united = new SignInterpretationCommentOperation(this.signInterpretationId, this.nextComment);
        united.prevComment = other.prevComment;

        return united;
    }
}

export type SignInterpretationEditOperationType = 'create' | 'update' | 'delete';

export abstract class SignInterperationEditOperation extends ArtefactEditorOperation {
    constructor(public signOpType: SignInterpretationEditOperationType) {
        super('sign');
    }

    public uniteWith(op: ArtefactEditorOperation): ArtefactEditorOperation | undefined {
        if (op.type !== 'sign') {
            return undefined;
        }

        const other = op as SignInterperationEditOperation;
        if (this.type !== op.type) {
            return undefined;
        }

        return this.uniteWithRightOp(other);
    }

    protected abstract uniteWithRightOp(op: SignInterperationEditOperation): SignInterperationEditOperation | undefined;
}

interface SignData {
    character: string;
    signType: [number, string];
    isReconstructed: boolean;
}

export class UpdateSignInterperationOperation extends SignInterperationEditOperation {
    // Update a sign interepration - updates affect the character and the attributes.
    public signInterpretationId: number;
    public prev: SignData;
    public next: SignData;

    constructor(signInterperationId: number, character: string, signTypeId: number, signTypeString: string, isReconstructed: boolean) {
        super('update');

        this.signInterpretationId = signInterperationId;

        this.next = {
            character,
            signType: [signTypeId, signTypeString],
            isReconstructed
        };
        this.prev = this.getPrevSignData();
    }

    public redo() {
        const si = this.signInterpretation;
        si.character = this.next.character;
        si.signType = this.next.signType;
        si.isReconstructed = this.next.isReconstructed;
    }

    public undo() {
        const si = this.signInterpretation;
        si.character = this.prev.character;
        si.signType = this.prev.signType;
        si.isReconstructed = this.prev.isReconstructed;
    }

    protected uniteWithRightOp(op: SignInterperationEditOperation): SignInterperationEditOperation | undefined {
        const other = op as UpdateSignInterperationOperation; // We are sure this is the right type
        if (this.signInterpretationId !== other.signInterpretationId) {
            return undefined;
        }

        const united = new UpdateSignInterperationOperation(this.signInterpretationId,
                                                            this.next.character,
                                                            this.next.signType[0],
                                                            this.next.signType[1],
                                                            this.next.isReconstructed);
        united.prev = other.prev;

        return united;
    }

    private get signInterpretation() {
        return state().signInterpretations.get(this.signInterpretationId)!;
    }

    private getPrevSignData() {
        const si = this.signInterpretation;
        return {
            character: si.character || '',
            signType: si.signType,
            isReconstructed: si.isReconstructed,
        };
    }
}

export class DeleteSignInterpretationOperation extends SignInterperationEditOperation {
    public signInterperationId: number;
    public sign: Sign;

    constructor(signIntepretationId: number) {
        super('delete');
        this.signInterperationId = signIntepretationId;
        this.sign = state().signInterpretations.get(this.signInterperationId)!.sign;
    }

    public uniteWithRightOp(op: SignInterperationEditOperation): SignInterperationEditOperation | undefined {
        return undefined;
    }

    public redo() {
        // Delete the sign from the line
        this.sign.line.signs.splice(this.sign.indexInLine, 1);
    }

    public undo() {
        // Add the sign back into the line
        this.sign.line.signs.splice(this.sign.indexInLine, 0, this.sign);
    }
}

export class CreateSignInterpretationOperation extends SignInterperationEditOperation {
    public sign: Sign;

    constructor(addAfterSignId: number, character: string, signTypeId: number, signTypeString: string, isReconstructed: boolean) {
        super('create');

        // We need to construct a brand new Sign object
        const prevSignId = state().signInterpretations.get(addAfterSignId)!;
        const prevSign = prevSignId.sign;

        // First, create a sign with no interpretations
        this.sign = new Sign({ signInterpretations: [] }, prevSign.line, prevSign.indexInLine + 1);

        // Now the new sign interpretation
        const si = new SignInterpretation({
            character,
            isVariant: false,
            signInterpretationId: SignInterpretation.nextAvailableId,
            nextSignInterpretations: [],
            attributes: [],
            rois: [],
        }, this.sign);

        // And the attributes
        si.isReconstructed = isReconstructed;
        si.signType = [signTypeId, signTypeString];

        this.sign.signInterpretations. push(si);
    }

    public uniteWithRightOp(op: SignInterperationEditOperation): SignInterperationEditOperation | undefined {
        return undefined;
    }

    public redo() {
        // Add the sign into the line
        this.sign.line.signs.splice(this.sign.indexInLine, 0, this.sign);
    }

    public undo() {
        // Delete the sign from the line
        this.sign.line.signs.splice(this.sign.indexInLine, 1);
    }
}
