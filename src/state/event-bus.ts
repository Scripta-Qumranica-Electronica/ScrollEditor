import mitt, { Emitter } from 'mitt';

export type EventBusEvents =
| 'corrupted-state'
| 'remove-roi'
| 'roi-changed'
| 'change-artefact-rotation'
| 'select-artefact'
| 'select-group'
| 'save-group'
| 'cancel-group'
| 'delete-group'
| 'update-operation-id'
| 'new-operation'         // New operaton for the active operations manager
| 'new-bulk-operations'  // New bulk operations for the active operations manager
| 'change-artefact-edit-line'
| 'change-artefact-add-line'
| 'change-artefact-delete-line'
| 'delete-key-pressed';   // Delete key in the scroll editor -> remove selected artefact/group



export class EventBus {
    // mitt is untyped-per-event here on purpose: the public facade below keeps
    // the original on/off/emit(...args) signature that the rest of the app uses.
    private eventBus: Emitter<Record<EventBusEvents, any>>;

    public constructor() {
        this.eventBus = mitt();
    }

    public on<T>(event: EventBusEvents, callback: (...args: T[]) => void) {
        this.eventBus.on(event, callback as any);
    }

    public off<T>(event: EventBusEvents, callback?: (...args: T[]) => void) {
        this.eventBus.off(event, callback as any);
     }

    public emit<T>(event: EventBusEvents, ...args: T[]) {
        // mitt.emit takes a single payload argument. Preserve the old
        // variadic facade: pass the lone arg through, or the array when many.
        this.eventBus.emit(event, args.length <= 1 ? args[0] : args);
     }
}
