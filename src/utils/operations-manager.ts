// This file contains handy utilities for managing operations.
// It handles undo/redo, as well as dirty tracking and auto-saving.
//
// Since it is generic, specifics are provided by by implementation of the operations classes, as well as
// the save helper interface

export interface Operation<T extends Operation<T, K>, K = number> {
    // Unite with a previous operation - returns undefined if the operations can't be united
    uniteWith(prev: T): T | undefined;

    undo(): void;  // Undo the operation
    redo(): void;  // Redo the operation
    getId(): K;    // Gets the ID of the affected entity
}

// Pass this interface to components that implement the undo/redo/save buttons, so they can
// disable the buttons without being exposed to the entire UndoRedoManager interface
export interface OperationsManagerStatus {
    canUndo: boolean;
    canRedo: boolean;
    isDirty: boolean;
    isSaving: boolean;
}

export interface SavingAgent<K = number> {
    saveEntities(ids: K[]): Promise<boolean>;  // Saves elements, returns false if saving failed, true if succeeded
}

export class OperationsManager<OP extends Operation<OP, K>, K = number> implements OperationsManagerStatus {
    private undoStack: OP[] = [];
    private redoStack: OP[] = [];
    private dirty: Set<K> = new Set<K>();
    private _isDirty: boolean = false;
    private saveInProgress: boolean = false;
    private autoSaveTimer? : number;

    // Set autoSaveInterval to 0 to disable autoSave
    constructor(private savingAgent: SavingAgent<K>, public autoSaveInterval = 3000) { }

    // Add operation to the undo stack, uniting operations if applicable
    public addOperation(op: OP) {
        this.redoStack = [];

        if (this.undoStack.length > 0) {
            const lastIndex = this.undoStack.length - 1;
            const united = op.uniteWith(this.undoStack[lastIndex]);
            if (united) {
                this.undoStack[lastIndex] = united;
                return;
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
            for (const id of preSaveDirty) {
                this.dirty.add(id);
                this._isDirty = true;
            }
            console.warn('Saving failed');
        }
    }

    private setDirty(op: Operation<OP, K>) {
        this.dirty.add(op.getId());
        this._isDirty = true;

        if (this.autoSaveInterval) {
            if (this.autoSaveTimer) {
                window.clearTimeout(this.autoSaveTimer);
            }
            this.autoSaveTimer = window.setTimeout(() => this.save(), this.autoSaveInterval);
        }
    }
}
