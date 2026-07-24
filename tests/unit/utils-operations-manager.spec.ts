import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    Operation,
    OperationsManager,
    SavingAgent,
} from '@/utils/operations-manager';

// A concrete Operation used to exercise the manager. It records a numeric value
// change on an entity identified by `entityId`, and can unite with a previous
// TestOp on the same entity.
class TestOp extends Operation<TestOp, number> {
    public applied = false;

    constructor(public entityId: number, public value: number, public unitable = true) {
        super();
    }

    public getId(): number {
        return this.entityId;
    }

    public replaceEntityId(newId: number): void {
        this.entityId = newId;
    }

    public uniteWith(prev: TestOp): TestOp | undefined {
        if (!this.unitable || prev.entityId !== this.entityId) {
            return undefined;
        }
        // The united op keeps the latest value.
        return new TestOp(this.entityId, this.value, this.unitable);
    }

    protected internalUndo(): void {
        this.applied = false;
    }

    protected internalRedo(): void {
        this.applied = true;
    }
}

class RecordingSavingAgent implements SavingAgent<TestOp, number> {
    public calls: TestOp[][] = [];
    constructor(public result: boolean | (() => Promise<boolean>) = true) {}

    public async saveEntities(ops: TestOp[]): Promise<boolean> {
        this.calls.push(ops);
        if (typeof this.result === 'function') {
            return this.result();
        }
        return this.result;
    }
}

// autoSaveInterval 0 disables the timer so tests are deterministic.
function makeManager(agent = new RecordingSavingAgent()) {
    return { manager: new OperationsManager<TestOp, number>(agent, 0), agent };
}

describe('Operation base class', () => {
    it('redo(initial=true) sets applied and needsSaving', () => {
        const op = new TestOp(1, 5);
        op.redo(true);
        expect(op.applied).toBe(true);
        expect(op.needsSaving).toBe(true);
        expect(op.undone).toBe(false);
    });

    it('undo toggles undone and flips needsSaving', () => {
        const op = new TestOp(1, 5);
        op.redo(true);
        op.undo();
        expect(op.undone).toBe(true);
        expect(op.applied).toBe(false);
        // needsSaving was true, undo flips it
        expect(op.needsSaving).toBe(false);
    });

    it('undo twice warns and is a no-op the second time', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        const op = new TestOp(1, 5);
        op.redo(true);
        op.undo();
        op.undo();
        expect(warn).toHaveBeenCalledWith('Operation has already been undone');
        warn.mockRestore();
    });

    it('redo without a prior undo warns and is a no-op', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        const op = new TestOp(1, 5);
        op.redo(true);
        op.redo(); // not initial, not undone -> warns
        expect(warn).toHaveBeenCalledWith('Operation has already been redone');
        warn.mockRestore();
    });

    it('undo then redo restores the applied state and flips needsSaving back', () => {
        const op = new TestOp(1, 5);
        op.redo(true); // needsSaving = true
        op.undo(); // needsSaving = false
        op.redo(); // needsSaving flips -> true
        expect(op.applied).toBe(true);
        expect(op.undone).toBe(false);
        expect(op.needsSaving).toBe(true);
    });
});

describe('OperationsManager - stacks & flags', () => {
    it('starts with nothing to undo/redo and reports No changes', () => {
        const { manager } = makeManager();
        expect(manager.canUndo).toBe(false);
        expect(manager.canRedo).toBe(false);
        expect(manager.isDirty).toBe(false);
        expect(manager.isSaving).toBe(false);
        expect(manager.saveMessage).toBe('No changes');
    });

    it('addOperation makes the manager undoable and dirty', () => {
        const { manager } = makeManager();
        manager.addOperation(new TestOp(1, 1));
        expect(manager.canUndo).toBe(true);
        expect(manager.isDirty).toBe(true);
        expect(manager.saveMessage).toBe('Save pending');
        expect(manager.isEntityDirty(1)).toBe(true);
        expect(manager.isEntityDirty(2)).toBe(false);
    });

    it('undo moves the op to the redo stack', () => {
        const { manager } = makeManager();
        const op = new TestOp(1, 1);
        op.redo(true);
        manager.addOperation(op);
        manager.undo();
        expect(manager.canUndo).toBe(false);
        expect(manager.canRedo).toBe(true);
        expect(op.undone).toBe(true);
    });

    it('redo moves the op back to the undo stack', () => {
        const { manager } = makeManager();
        const op = new TestOp(1, 1);
        op.redo(true);
        manager.addOperation(op);
        manager.undo();
        manager.redo();
        expect(manager.canUndo).toBe(true);
        expect(manager.canRedo).toBe(false);
        expect(op.undone).toBe(false);
    });

    it('adding a new operation clears the redo stack', () => {
        const { manager } = makeManager();
        const op = new TestOp(1, 1);
        op.redo(true);
        manager.addOperation(op);
        manager.undo();
        expect(manager.canRedo).toBe(true);
        manager.addOperation(new TestOp(2, 2));
        expect(manager.canRedo).toBe(false);
    });

    it('undo on empty stack warns and does nothing', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        const { manager } = makeManager();
        manager.undo();
        expect(warn).toHaveBeenCalledWith('UndoRedoManager.undo called with an empty undo stack');
        warn.mockRestore();
    });

    it('redo on empty stack warns and does nothing', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        const { manager } = makeManager();
        manager.redo();
        expect(warn).toHaveBeenCalledWith('UndoRedoManager.redo called with an empty redo stack');
        warn.mockRestore();
    });
});

describe('OperationsManager - uniting operations', () => {
    it('unites two consecutive unitable ops on the same entity into one undo entry', () => {
        const { manager } = makeManager();
        manager.addOperation(new TestOp(1, 1));
        manager.addOperation(new TestOp(1, 2)); // unites with previous
        // Still a single undo entry
        manager.undo();
        expect(manager.canUndo).toBe(false);
        expect(manager.isEntityDirty(1)).toBe(true);
    });

    it('does not unite when uniteWith returns undefined -> two undo entries', () => {
        const { manager } = makeManager();
        manager.addOperation(new TestOp(1, 1));
        manager.addOperation(new TestOp(1, 2, /*unitable*/ false));
        manager.undo();
        // Second op was undone, but a first op remains
        expect(manager.canUndo).toBe(true);
    });

    it('does not unite ops on different entities', () => {
        const { manager } = makeManager();
        manager.addOperation(new TestOp(1, 1));
        manager.addOperation(new TestOp(2, 2));
        manager.undo();
        expect(manager.canUndo).toBe(true);
    });
});

describe('OperationsManager - bulk operations', () => {
    it('addBulkOperations pushes a single multi-op undo entry and marks all dirty', () => {
        const { manager } = makeManager();
        const ops = [new TestOp(1, 1), new TestOp(2, 2), new TestOp(3, 3)];
        ops.forEach(o => o.redo(true));
        manager.addBulkOperations(ops);
        expect(manager.canUndo).toBe(true);
        expect(manager.isEntityDirty(1)).toBe(true);
        expect(manager.isEntityDirty(2)).toBe(true);
        expect(manager.isEntityDirty(3)).toBe(true);
        manager.undo();
        // one entry containing all three -> single undo removes them all
        expect(manager.canUndo).toBe(false);
        ops.forEach(o => expect(o.undone).toBe(true));
    });

    it('addBulkOperations clears the redo stack', () => {
        const { manager } = makeManager();
        const op = new TestOp(1, 1);
        op.redo(true);
        manager.addOperation(op);
        manager.undo();
        expect(manager.canRedo).toBe(true);
        manager.addBulkOperations([new TestOp(5, 5)]);
        expect(manager.canRedo).toBe(false);
    });
});

describe('OperationsManager - updateStackIds', () => {
    it('rewrites ids across undo and redo stacks', () => {
        const { manager } = makeManager();
        const undoOp = new TestOp(1, 1);
        undoOp.redo(true);
        manager.addOperation(undoOp);

        const redoOp = new TestOp(1, 2, false);
        redoOp.redo(true);
        manager.addOperation(redoOp);
        manager.undo(); // redoOp goes to redo stack

        manager.updateStackIds(1, 99);
        expect(undoOp.getId()).toBe(99);
        expect(redoOp.getId()).toBe(99);
    });

    it('leaves non-matching ids untouched', () => {
        const { manager } = makeManager();
        const op = new TestOp(7, 1);
        op.redo(true);
        manager.addOperation(op);
        manager.updateStackIds(1, 99);
        expect(op.getId()).toBe(7);
    });
});

describe('OperationsManager - save()', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('successful save clears dirty state and marks ops as saved', async () => {
        const { manager, agent } = makeManager();
        const op = new TestOp(1, 1);
        op.redo(true);
        manager.addOperation(op);
        expect(manager.isDirty).toBe(true);

        await manager.save();

        expect(agent.calls.length).toBe(1);
        expect(agent.calls[0]).toContain(op);
        expect(manager.isDirty).toBe(false);
        expect(op.needsSaving).toBe(false);
        expect(manager.saveMessage).toBe('No changes');
    });

    it('failed save keeps the entity dirty', async () => {
        const agent = new RecordingSavingAgent(false);
        const { manager } = makeManager(agent);
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        const op = new TestOp(1, 1);
        op.redo(true);
        manager.addOperation(op);

        await manager.save();

        expect(manager.isDirty).toBe(true);
        expect(manager.isEntityDirty(1)).toBe(true);
        expect(warn).toHaveBeenCalledWith('Saving failed');
        warn.mockRestore();
    });

    it('a thrown saving agent is treated as a failed save', async () => {
        const agent = new RecordingSavingAgent(async () => {
            throw new Error('boom');
        });
        const { manager } = makeManager(agent);
        const errSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        const op = new TestOp(1, 1);
        op.redo(true);
        manager.addOperation(op);

        await manager.save();

        expect(manager.isDirty).toBe(true);
        expect(errSpy).toHaveBeenCalled();
        errSpy.mockRestore();
        warnSpy.mockRestore();
    });

    it('only ops that needSaving are sent to the agent', async () => {
        const { manager, agent } = makeManager();
        const op = new TestOp(1, 1);
        op.redo(true);
        manager.addOperation(op);
        // Undo makes needsSaving false; the op stays in the dirty set but is filtered out.
        manager.undo();
        await manager.save();
        // preSaveDirty filters op.needsSaving === true; undone op has needsSaving false
        expect(agent.calls[0]).not.toContain(op);
    });
});

describe('OperationsManager - autoSave timer path', () => {
    it('schedules an autosave via window.setTimeout when interval > 0', () => {
        vi.useFakeTimers();
        const setTimeoutSpy = vi.spyOn(window, 'setTimeout');
        const agent = new RecordingSavingAgent();
        const manager = new OperationsManager<TestOp, number>(agent, 3000);
        const op = new TestOp(1, 1);
        op.redo(true);
        manager.addOperation(op);
        expect(setTimeoutSpy).toHaveBeenCalled();

        // A second op resets the timer (clearTimeout path).
        const clearSpy = vi.spyOn(window, 'clearTimeout');
        manager.addOperation(new TestOp(2, 2));
        expect(clearSpy).toHaveBeenCalled();

        // Fire the timer -> triggers save().
        vi.runAllTimers();
        expect(agent.calls.length).toBeGreaterThanOrEqual(1);

        setTimeoutSpy.mockRestore();
        clearSpy.mockRestore();
        vi.useRealTimers();
    });

    it('dispose() cancels a pending autosave so it never fires after teardown', () => {
        // Regression: an editor unmounting <autoSaveInterval after a change must not
        // let the queued save() run against its torn-down SavingAgent.
        vi.useFakeTimers();
        const agent = new RecordingSavingAgent();
        const manager = new OperationsManager<TestOp, number>(agent, 3000);
        const op = new TestOp(1, 1);
        op.redo(true);
        manager.addOperation(op); // schedules the autosave timer

        manager.dispose(); // editor unmount cancels it

        vi.runAllTimers();
        expect(agent.calls.length).toBe(0); // save() never fired

        vi.useRealTimers();
    });
});
