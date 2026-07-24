// Barrel for the state layer. The StateManager class lives in ./state-manager so
// that the cycle-free singleton accessor (./current) can break the import cycles
// that ran through this module. Consumers keep importing `StateManager` from
// `@/state` unchanged; sub-state modules and models import `currentState` from
// `@/state/current` instead (see the note in ./current.ts).
export { StateManager } from './state-manager';
export { currentState } from './current';
