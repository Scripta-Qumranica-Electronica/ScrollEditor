export type EventBusEvents = 'remove-roi' | 'place-roi' | 'roi-changed'; // ....

export class EventBus {
    private eventBus: Vue;

    public constructor() { 
        // init this.eventBus
    }

    public on<T>(event: EventBusEvents, callback: (arg: T) => void) { 
        // call eventBus.on
    }

    public off<T>(event: EventBusEvents, callback?) { ... }

    public emit<T>(event, arg: T) { ... }
}