// Cycle-free accessor for the StateManager singleton.
//
// The problem: state/state-manager.ts must import every sub-state module and
// service to construct the manager, while those same modules need the singleton
// for their runtime `state()` helpers. If they import the StateManager barrel back,
// they form an import cycle (state -> sub-module -> state). Those cycles are
// runtime-safe for the .ts modules (access is inside functions), but they confuse
// Vite's HMR boundary detection, which then re-evaluates a broad module set in an
// order that puts component-decorator bindings (TextLine, EditSignModal,
// PermissionModal, ...) into the temporal dead zone -> "Cannot access X before
// initialization" on hot reload.
//
// The fix: sub-modules import `currentState()` from HERE instead of the barrel.
// This module imports StateManager only as a TYPE (erased at runtime), so it sits
// at the bottom of the graph with no runtime edges — breaking every cycle that ran
// through the singleton.
import type { StateManager } from './state-manager';

let current: StateManager | undefined;
let build: (() => StateManager) | undefined;

// Registered once by state-manager.ts at module init so the very first
// currentState() call can lazily construct the singleton without importing the
// concrete class here (which would re-introduce the cycle).
export function _setStateManagerBuilder(fn: () => StateManager): void {
    build = fn;
}

// Called by the StateManager constructor before it does anything else, so a
// sub-state module invoked mid-construction still resolves the (partially built)
// singleton rather than recursing.
export function _setCurrentState(sm: StateManager): void {
    current = sm;
}

export function currentState(): StateManager {
    if (!current && build) {
        current = build();
    }
    if (!current) {
        throw new Error('StateManager accessed before initialization');
    }
    return current;
}
