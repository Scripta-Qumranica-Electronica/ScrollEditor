// This file contains handy utilities for managing operations.
// It handles undo/redo, as well as dirty tracking and auto-saving.
//
// Since it is generic, specifics are provided by by implementation of the operations classes, as well as
// the save helper interface

import { xgcd } from 'mathjs';

export interface Operation<T extends Operation<T, K>, K = number> {
    // Unite with a previous operation - returns undefined if the operations can't be united
    uniteWith(prev: T): T | undefined;

    undo(): void;  // Undo the operation
    redo(): void;  // Redo the operation
    getId(): K;    // Gets the ID of the affected entity
    replaceEntityId(newId: K): void; // Update the id of the entity
}

// Pass this interface to components that implement the undo/redo/save buttons, so they can
// disable the buttons without being exposed to the entire UndoRedoManager interface
export interface OperationsManagerStatus {
    canUndo: boolean;
    canRedo: boolean;
    isDirty: boolean;
    isSaving: boolean;
}

export interface SavingAgent<OP extends Operation<OP, K>, K = number> {
    saveEntities(ids: OP[]): Promise<boolean>;  // Saves elements, returns false if saving failed, true if succeeded
}

export class OperationsManager<OP extends Operation<OP, K>, K = number> implements OperationsManagerStatus {
    private undoStack: OP[] = [];
    private redoStack: OP[] = [];
    private dirty: Set<OP> = new Set<OP>();
    private _isDirty: boolean = false;
    private saveInProgress: boolean = false;
    private autoSaveTimer?: number;

    // Set autoSaveInterval to 0 to disable autoSave
    constructor(private savingAgent: SavingAgent<OP, K>, public autoSaveInterval = 3000) { }

    // Add operation to the undo stack, uniting operations if applicable
    public addOperation(op: OP) {
        this.redoStack = [];
        // Check if two operations can be united. Two operations can be united if:
        // 1. They are of the same type.
        // 2. op1.uniteWith(op2) returns an operation
        // 3. The dirty flag is set. If the dirty flag is clear, we must have a new operation, otherwise
        //    undoing can cause issues with saving.
        if (this.undoStack.length > 0 && this.dirty.size) {
            const lastIndex = this.undoStack.length - 1;
            const lastOp = this.undoStack[lastIndex];

            if (typeof op === typeof lastOp) {
                const united = op.uniteWith(lastOp);
                if (united) {
                    this.undoStack[lastIndex] = united;
                    this.setDirty(united, lastOp);
                    return;
                }
            }
        }

        this.setDirty(op);
        this.undoStack.push(op);
    }

    public get canUndo(): boolean {
        return this.undoStack.length !== 0;
    }

    public get canRedo(): boolean {
        return this.redoStack.length !== 0;
    }

    public get isDirty(): boolean {
        // We do not use `this.dirty.size > 0` since Vue does not bind property to set sizes, and does not
        // refresh when the dirty flag changes
        return this._isDirty;
    }

    public get isSaving(): boolean {
        return this.saveInProgress;
    }

    public undo() {
        const op = this.undoStack.pop();
        if (!op) {
            console.warn('UndoRedoManager.undo called with an empty undo stack');
            return;
        }
        op.undo();
        this.redoStack.push(op);
        this.setDirty(op);
    }

    public redo() {
        const op = this.redoStack.pop();
        if (!op) {
            console.warn('UndoRedoManager.redo called with an empty redo stack');
            return;
        }
        op.redo();
        this.undoStack.push(op);
        this.setDirty(op);
    }

    public async save() {
        // Saving is an asynchronous operation that can take a while. We need to take precautions so
        // that saving does not run twice concurrently
        if (this.isSaving) {
            console.error('Saving already in progress');
            throw new Error('Saving already in progress');
        }

        // Now we're saving. Store the dirty set so we remark as dirty of saving fails
        const preSaveDirty = Array.from(this.dirty);
        this.dirty.clear();
        this._isDirty = false;
        let saveOk = false;
        try {
            saveOk = await this.savingAgent.saveEntities(preSaveDirty);
        } catch (error) {
            console.error('Saving throw an exception: ', error);
            saveOk = false;
        }

        if (!saveOk) {
            // Saving failed, add all dirty elements back
            for (const op of preSaveDirty) {
                this.dirty.add(op);
                this._isDirty = true;
            }
            console.warn('Saving failed');
        }
    }

    public updateStackIds(oldId: K, newId: K) {
        // Fix the ids in the undo-stack
        for (const op of this.undoStack) {
            if (op.getId() === oldId) {
                op.replaceEntityId(newId);
            }
        }

        // The redo-stack
        for (const op of this.redoStack) {
            if (op.getId() === oldId) {
                op.replaceEntityId(newId);
            }
        }

        // Don't go over the dirty set, as it contains objects that are in the undo or redo stacks
    }

    private setDirty(op: OP, oldOp?: OP) {
        if (oldOp) {
            this.dirty.delete(oldOp);
        }

        this.dirty.add(op);
        this._isDirty = true;

        if (this.autoSaveInterval) {
            if (this.autoSaveTimer) {
                window.clearTimeout(this.autoSaveTimer);
            }
            this.autoSaveTimer = window.setTimeout(() => this.save(), this.autoSaveInterval);
        }
    }
}
