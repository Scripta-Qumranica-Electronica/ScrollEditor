import { NotificationHandler } from '@/dtos/temp-signalr';
import { EditionDTO } from '@/dtos/sqe-dtos';
import { EditionInfo } from '@/models/edition';
import { StateManager } from '.';

/* This file contains the implementation of all the incoming events from SignalR */

export class SignalRNotifcationHandler extends NotificationHandler {
    public handleUpdatedEdition(edition: EditionDTO): void {
        console.debug('handleUpdateEdition ', edition);

        const storedEdition = StateManager.instance.editions.find(edition.id);

        if (storedEdition) {
            const editionInfo = new EditionInfo(edition);
            const newEdition = {...storedEdition, ...editionInfo};
            StateManager.instance.editions.update(newEdition);
        }
    }

}
