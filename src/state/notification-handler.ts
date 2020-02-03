import { NotificationHandler } from '@/dtos/temp-signalr';
import { EditionDTO } from '@/dtos/sqe-dtos';

/* This file contains the implementation of all the incoming events from SignalR */

export class SignalRNotifcationHandler extends NotificationHandler {
    public handleUpdatedEdition(edition: EditionDTO): void {
        console.debug('handleUpdateEdition ', edition);
    }
}
