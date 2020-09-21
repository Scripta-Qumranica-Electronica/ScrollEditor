import Vue from 'vue';

export type EventBusEvents =
| 'remove-roi'
| 'place-roi'
| 'roi-changed'
| 'change-artefact-rotation'
| 'select-artefact'
| 'select-group'
| 'save-group'
| 'cancel-group'
| 'delete-group'
| 'update-operation-id'
| 'new-operation';

export class EventBus {
    private eventBus: Vue;

    public constructor() {
        this.eventBus = new Vue();
    }

    public on<T>(event: EventBusEvents, callback: (...args: T[]) => void) {
        this.eventBus.$on(event, callback);
    }

    public off<T>(event: EventBusEvents, callback?: (...args: T[]) => void) {
        this.eventBus.$off(event, callback);
     }

    public emit<T>(event: EventBusEvents, ...args: T[]) {
        this.eventBus.$emit(event, ...args);
     }
}
