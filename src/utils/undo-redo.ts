// This file contains handy utilities for managing undo/redo operations
// Each component that wants to support undo/redo operations needs to implement its own operation types classes,
// and can then instantiate an UndoRedoManager.
//
// Note that UndoRedoManager has a template argument that is an Operation. This allows you to declare one base
// operation type, and derive all your operation types from it, and make sure no operation type from some other
// components lurk in.
//
//  For example, in the ImagedObjectEditor we could have an
//
// interface ImagedObjectOperation extends Operation { }
//
// Implement this interface multiple times and define an UndoRedoManager<ImagedObjectOperation>

export interface Operation {
    // Unite with a previous operation - returns undefined if the operations can't be united
    uniteWith(prev: Operation): Operation | undefined;

    undo(): void;  // Undo the operation
    redo(): void;  // Redo the operation
}

// Pass this interface to components that implement the undo/redo buttons, so they can
// disable the buttons without being exposed to the entire UndoRedoManager interface
export interface CanUndoRedo {
    canUndo: boolean;
    canRedo: boolean;
}

export class UndoRedoManager<T extends Operation> implements CanUndoRedo {
    private undoStack: T[] = [];
    private redoStack: T[] = [];

    // Add operation to the undo stack, uniting operations if applicable
    public addOperation(op: T) {
        this.redoStack = [];

        if (this.undoStack.length > 0) {
            const lastIndex = this.undoStack.length - 1;
            const united = op.uniteWith(this.undoStack[lastIndex]);
            if (united) {
                this.undoStack[lastIndex] = united as T;
                return;
            }
        }

        this.undoStack.push(op);
    }

    public get canUndo(): boolean {
        return this.undoStack.length !== 0;
    }

    public get canRedo(): boolean {
        return this.redoStack.length !== 0;
    }

    public undo() {
        const op = this.undoStack.pop();
        if (!op) {
            console.warn('UndoRedoManager.undo called with an empty undo stack');
            return;
        }
        op.undo();
        this.redoStack.push(op);
    }

    public redo() {
        const op = this.redoStack.pop();
        if (!op) {
            console.warn('UndoRedoManager.redo called with an empty redo stack');
            return;
        }
        op.redo();
        this.undoStack.push(op);
    }
}
