import { Operation } from '@/utils/operations-manager';
import { Artefact } from '@/models/artefact';
import { StateManager } from '@/state';
import { InterpretationRoi, Sign, SignInterpretation } from '@/models/text';
import { InterpretationAttributeDTO, SignDTO, LineDTO } from '@/dtos/sqe-dtos';
import Vue from 'vue';
import TextService from '@/services/text';
import { NumberFormatResult } from 'vue-i18n';

function state() {
    return StateManager.instance;
}

export type ArtefactEditorOperationType = 'rotate' | 'draw' | 'erase' | 'attr' | 'commentary' | 'sign' | 'editLine' | 'addLine' | 'deleteLine';


export abstract class ArtefactEditorOperation extends Operation<ArtefactEditorOperation> {
    public constructor(
        public type: ArtefactEditorOperationType
    ) {
        super();
    }

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

    protected internalUndo(): void {
        state().eventBus.emit('change-artefact-rotation', this.prev);
        // this.artefactEditorInstance.params.rotationAngle = this.prev;
    }

    protected internalRedo(): void {
        state().eventBus.emit('change-artefact-rotation', this.next);

        // this.artefactEditorInstance.params.rotationAngle = this.next;
    }
}
export class ArtefactEditLineOperation extends ArtefactEditorOperation {
    public checkText: TextService = new TextService();
    public editionId: number;
    public firstChar: number;
    public lastChar: number;
    public next: string;
    public prev: string;


    public constructor(
        editionId: number,
        firstChar: number,
        lastChar: number,
        next: string,
        prev: string

    ) {
        super('editLine');
        this.editionId = editionId;
        this.firstChar = firstChar;
        this.lastChar = lastChar;
        this.prev = prev;
        this.next = next;
    }

    public uniteWith(op: ArtefactEditorOperation): ArtefactEditorOperation | undefined {
        // Unite operations of the same type
        if (op.type !== 'editLine') {
            return undefined;
        }

        if (op.type !== this.type) {
            return undefined;
        }

        // Operations are of the same type on the same artefact, we can unite them
        return new ArtefactEditLineOperation(this.editionId, this.firstChar, this.lastChar,
            this.next,
            (op as ArtefactEditLineOperation).prev

        );
    }

    protected internalUndo(): void {
        state().eventBus.emit('change-artefact-edit-line', this.prev);
        this.checkText.replaceText(this.editionId, this.firstChar, this.lastChar, this.prev);
    }

    protected internalRedo(): void {
        this.checkText.replaceText(this.editionId, this.firstChar, this.lastChar, this.next);
        state().eventBus.emit('change-artefact-edit-line', this.next);
    }
}
export class ArtefactAddLineOperation extends ArtefactEditorOperation {
    public checkText: TextService = new TextService();
    public line: LineDTO;
    public textFragmentId: number;
    public previousLineId: number ;
    public subsequentLineId: number;


    public constructor(
        line: LineDTO,
        textFragmentId: number,
        previousLineId: number ,
        subsequentLineId: number

    ) {
        super('addLine');
        this.line = line;
        this.textFragmentId = textFragmentId;
        this.previousLineId = previousLineId;
        this.subsequentLineId = subsequentLineId;
    }

    public uniteWith(op: ArtefactEditorOperation): ArtefactEditorOperation | undefined {
        // Unite operations of the same type
        if (op.type !== 'addLine') {
            return undefined;
        }

        if (op.type !== this.type) {
            return undefined;
        }

        // Operations are of the same type on the same artefact, we can unite them
        return new ArtefactAddLineOperation(this.line, this.textFragmentId, this.previousLineId,
            this.subsequentLineId,
        );
    }

    protected internalUndo(): void {
        // state().eventBus.emit('change-artefact-add-line', this.prev);
        this.checkText.deleteLine(this.line.editorId, this.line.lineId);
    }

    protected internalRedo(): void {
        this.checkText.createLine(this.line, this.textFragmentId, this.previousLineId, this.subsequentLineId);
        // state().eventBus.emit('change-artefact-add-line', this.next);
    }
}
export class ArtefactDeleteLineOperation extends ArtefactEditorOperation {
    public checkText: TextService = new TextService();
    public line: LineDTO;
    public textFragmentId: number;
    public previousLineId: number ;
    public subsequentLineId: number;


    public constructor(
        line: LineDTO,
        textFragmentId: number,
        previousLineId: number ,
        subsequentLineId: number

    ) {
        super('deleteLine');
        this.line = line;
        this.textFragmentId = textFragmentId;
        this.previousLineId = previousLineId;
        this.subsequentLineId = subsequentLineId;
    }

    public uniteWith(op: ArtefactEditorOperation): ArtefactEditorOperation | undefined {
        // Unite operations of the same type
        if (op.type !== 'deleteLine') {
            return undefined;
        }

        if (op.type !== this.type) {
            return undefined;
        }

        // Operations are of the same type on the same artefact, we can unite them
        return new ArtefactDeleteLineOperation(this.line, this.textFragmentId, this.previousLineId,
            this.subsequentLineId,
        );
    }

    protected internalUndo(): void {
        // state().eventBus.emit('change-artefact-add-line', this.prev);
        this.checkText.createLine(this.line, this.textFragmentId, this.previousLineId, this.subsequentLineId);
    }

    protected internalRedo(): void {
        this.checkText.deleteLine(this.line.editorId, this.line.lineId);
        // state().eventBus.emit('change-artefact-add-line', this.next);
    }
}
// export class ArtefactAddLineOperation extends ArtefactEditorOperation {
//     public checkText: TextService = new TextService();
//     //new line inside sign 
//     public editionId: number;
//     public next: string;
//     public prev: string;
//     public constructor(
//         editionId: number,
//         next: string,
//         prev: string
//     )
//     {
//         super('addLine');
//         this.editionId = editionId;
//         this.prev = prev;
//         this.next = next;
//     }
//     public uniteWith(op: ArtefactEditorOperation): ArtefactEditorOperation | undefined {
//         // Unite operations of the same type
//         if (op.type !== 'addLine') {
//             return undefined;
//         }

//         if (op.type !== this.type) {
//             return undefined;
//         }

//         // Operations are of the same type on the same artefact, we can unite them
//         return new ArtefactAddLineOperation(this.editionId,
//             this.next,
//             (op as ArtefactAddLineOperation).prev

//         );
//     }
//     // take care of before and after
//     // we need prev and next
//     // send to backend new line with ngative id
//     // get the new line from backend along with artefact (the line will be positive and updated )
//     // we need here a internal undo and internal redo that delete the line just added
//     protected internalUndo(): void {
// // 
//                 // state().eventBus.emit('change-artefact-edit-line', this.prev);
//         // this.checkText.replaceText(this.editionId, this.firstChar, this.lastChar, this.prev);
//     }

//     protected internalRedo(): void {
//         // this.checkText.replaceText(this.editionId, this.firstChar, this.lastChar, this.next);
//         // state().eventBus.emit('change-artefact-edit-line', this.next);
//     }

// }

export class ArtefactROIOperation extends ArtefactEditorOperation {

    public constructor(
        type: ArtefactEditorOperationType,
        public roi: InterpretationRoi,
    ) {
        super(type);
        this.roi = roi.clone();
    }

    public uniteWith(op: ArtefactEditorOperation): ArtefactEditorOperation | undefined {
        return undefined;
    }

    protected internalUndo(): void {
        if (this.type === 'draw') {
            this.removeRoi();
        } else {
            this.placeRoi();
        }
    }

    protected internalRedo(): void {
        if (this.type === 'draw') {
            this.placeRoi();
        } else {
            this.removeRoi();
        }
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

    protected internalUndo() {
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

    protected internalRedo() {
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

    protected internalUndo() {
        this.signInterpretation.commentary = this.prevComment;
    }

    protected internalRedo() {
        this.signInterpretation.commentary = this.nextComment;
    }
}

export type SignInterpretationEditOperationType = 'create' | 'update' | 'delete';

export abstract class SignInterpretationEditOperation extends ArtefactEditorOperation {
    constructor(public signOpType: SignInterpretationEditOperationType) {
        super('sign');
    }

    public uniteWith(op: ArtefactEditorOperation): ArtefactEditorOperation | undefined {
        if (op.type !== 'sign') {
            return undefined;
        }

        const other = op as SignInterpretationEditOperation;
        if (this.type !== op.type) {
            return undefined;
        }

        return this.uniteWithRightOp(other);
    }

    public abstract get signInterpretation(): SignInterpretation;
    protected abstract uniteWithRightOp(op: SignInterpretationEditOperation): SignInterpretationEditOperation | undefined;
}

interface SignData {
    character: string;
    signType: [number, string];
}

export class UpdateSignInterperationOperation extends SignInterpretationEditOperation {
    // Update a sign interepration - updates affect the character and the attributes.
    public signInterpretationId: number;
    public prev: SignData;
    public next: SignData;

    constructor(signInterperationId: number, character: string, signTypeId: number, signTypeString: string) {
        super('update');

        this.signInterpretationId = signInterperationId;

        this.next = {
            character,
            signType: [signTypeId, signTypeString],
        };
        this.prev = this.getPrevSignData();
    }

    public get signInterpretation() {
        return state().signInterpretations.get(this.signInterpretationId)!;
    }

    protected internalRedo() {
        const si = this.signInterpretation;
        si.character = this.next.character;
        si.signType = this.next.signType;
    }

    protected internalUndo() {
        const si = this.signInterpretation;
        si.character = this.prev.character;
        si.signType = this.prev.signType;
    }

    protected uniteWithRightOp(op: SignInterpretationEditOperation): SignInterpretationEditOperation | undefined {
        const other = op as UpdateSignInterperationOperation; // We are sure this is the right type
        if (this.signInterpretationId !== other.signInterpretationId) {
            return undefined;
        }

        const united = new UpdateSignInterperationOperation(this.signInterpretationId,
                                                            this.next.character,
                                                            this.next.signType[0],
                                                            this.next.signType[1]);
        united.prev = other.prev;

        return united;
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

export class DeleteSignInterpretationOperation extends SignInterpretationEditOperation {
    public signInterpretationId: number;
    public sign: Sign;

    constructor(signIntepretationId: number) {
        super('delete');
        this.signInterpretationId = signIntepretationId;
        const si = state().signInterpretations.get(this.signInterpretationId, true);
        if (!si) {
            state().corrupted(`Can't find sign interpretation ${this.signInterpretationId}`);
        }
        this.sign = si!.sign;
    }

    public get signInterpretation() {
        return state().signInterpretations.get(this.signInterpretationId)!;
    }

    public uniteWithRightOp(op: SignInterpretationEditOperation): SignInterpretationEditOperation | undefined {
        return undefined;
    }

    protected get prevSign() {
        return this.sign.line.signs[this.sign.indexInLine - 1];
    }

    protected internalRedo() {
        // Delete the sign from the line
        this.sign.line.removeSign(this.sign);

        // Fix the linked list of signs
        const SI = this.sign.signInterpretations[0];
        const prevSI = this.prevSign.signInterpretations[0];
        prevSI.nextSignInterpretations = SI.nextSignInterpretations;

        state().signInterpretations.detachSignInterprerationFromArtefact(SI);
    }

    protected internalUndo() {
        // Add the sign back into the line
        this.sign.line.addSign(this.sign);

        // Fix the linked list of signs
        const SI = this.sign.signInterpretations[0];
        const prevSI = this.prevSign.signInterpretations[0];
        SI.nextSignInterpretations = prevSI.nextSignInterpretations;
        prevSI.nextSignInterpretations[0].nextSignInterpretationId = SI.signInterpretationId;
        state().signInterpretations.attachSignInterpretationToArtefact(SI);
    }
}

export class CreateSignInterpretationOperation extends SignInterpretationEditOperation {
    public sign: Sign;

    constructor(addAfterSignInterpretationId: number, character: string, signTypeId: number, signTypeString: string) {
        super('create');

        // We need to construct a brand new Sign object
        const prevSI = state().signInterpretations.get(addAfterSignInterpretationId, true);
        if (!prevSI) {
            state().corrupted(`Can't locate sign interpretation ${addAfterSignInterpretationId}`);
        }
        const prevSign = prevSI!.sign;

        // First, create a sign with no interpretations
        this.sign = new Sign({ signInterpretations: [] }, prevSign.line, prevSign.indexInLine + 1);

        // Now the new sign interpretation
        const si = new SignInterpretation({
            signId: -1,   // Patch, we don't really need the signID, but the DTO requires it
            character,
            isVariant: false,
            signInterpretationId: SignInterpretation.nextAvailableId,
            nextSignInterpretations: [],
            attributes: [],
            rois: [],
        }, this.sign);

        // And the attributes
        si.signType = [signTypeId, signTypeString];

        this.sign.signInterpretations.push(si);
        state().signInterpretations.put(si);
    }

    public get signInterpretation() {
        return this.sign.signInterpretations[0];
    }

    protected get prevSign() {
        return this.sign.line.signs[this.sign.indexInLine - 1];
    }

    protected internalRedo() {
        // Add the sign into the line
        this.sign.line.addSign(this.sign);

        // Fix the linked list of signs
        const SI = this.sign.signInterpretations[0];
        const prevSI = this.prevSign.signInterpretations[0];
        SI.nextSignInterpretations = prevSI.nextSignInterpretations;
        prevSI.nextSignInterpretations[0].nextSignInterpretationId = SI.signInterpretationId;
    }

    protected internalUndo() {
        // Delete the sign from the line
        this.sign.line.removeSign(this.sign);

        // Fix the linked list of signs
        const SI = this.sign.signInterpretations[0];
        const prevSI = this.prevSign.signInterpretations[0];
        prevSI.nextSignInterpretations = SI.nextSignInterpretations;
    }

    protected uniteWithRightOp(op: SignInterpretationEditOperation): SignInterpretationEditOperation | undefined {
        return undefined;
    }
}
