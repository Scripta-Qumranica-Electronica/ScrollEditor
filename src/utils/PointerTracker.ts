export class PointerTracker {
    private evtArray = [] as ExtendedPointerEvent[];

    public handleEvent(event: ExtendedPointerEvent) {
        const idx = this.getEventIndex(event);

        if (event.event.type === 'pointerdown') {
            if (idx !== -1) {
                console.error('Received down event for an already existing pointer', event);
            }
            this.evtArray.push(event);
            return;
        }

        if (idx === -1) {
            return;
        }

        if (event.event.type === 'pointermove') {
            this.evtArray[idx] = event;
        }

        if (event.event.type === 'pointerup') {
            // console.log('Removing event ', event, this.count, ' in array before removal');
            this.evtArray.splice(idx, 1);
            // console.log(`pointerup, left with ${this.count} elements`);
        }
    }

    private getEventIndex(event: ExtendedPointerEvent): number {
        return this.evtArray.findIndex((ev) => ev.pointerId === event.pointerId);
    }

    public get all(): ExtendedPointerEvent[] {
        return this.evtArray;
    }
    public get primary(): ExtendedPointerEvent {
        return this.evtArray[0];
    }
    public get secondary(): ExtendedPointerEvent {
        return this.evtArray[1];
    }
    public get count(): number {
        return this.evtArray.length;
    }
}

export interface Position {
    x: number;
    y: number;
}

export interface ExtendedPointerEvent {
    event: PointerEvent;
    pointerId: number;
    logicalPosition: Position;
}
