export class PointerTracker {
    private evtArray = [] as PointerTrackingEvent[];

    public handleEvent(event: PointerTrackingEvent) {
        const idx = this.getEventIndex(event);

        if (event.type === 'pointerdown') {
            if (idx !== -1) {
                console.error('Received down event for an already existing pointer', event);
            }
            this.evtArray.push(event);
            return;
        }

        if (idx === -1) {
            return;
        }

        if (event.type === 'pointermove') {
            this.evtArray[idx] = event;
        }

        if (event.type === 'pointerup' || event.type === 'pointercancel') {
            // console.log('Removing event ', event, this.count, ' in array before removal');
            this.evtArray.splice(idx, 1);
            // console.log(`pointerup, left with ${this.count} elements`);
        }
    }

    private getEventIndex(event: PointerTrackingEvent): number {
        return this.evtArray.findIndex((ev) => ev.pointerId === event.pointerId);
    }

    public get all(): PointerTrackingEvent[] {
        return this.evtArray;
    }
    public get primary(): PointerTrackingEvent {
        return this.evtArray[0];
    }
    public get secondary(): PointerTrackingEvent {
        return this.evtArray[1];
    }
    public get count(): number {
        return this.evtArray.length;
    }
}

export class Position {
    public static multiply(a: Position, factor: number) {
        return new Position(a.x * factor, a.y * factor);
    }

    public static substract(a: Position, b: Position) {
        return new Position(a.x - b.x, a.y - b.y);
    }

    public x: number;
    public y: number;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    public get norm(): number {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }
}

export class PointerTrackingEvent {
    public pointerId: number;
    public logicalPosition: Position;
    public timeStamp: number;
    public type: string;

    constructor(event: PointerEvent, logicalPosition: Position) {
        this.pointerId = event.pointerId;
        this.logicalPosition = logicalPosition;
        this.timeStamp = event.timeStamp;
        this.type = event.type;
    }
}
