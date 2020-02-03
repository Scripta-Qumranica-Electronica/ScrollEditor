import { EditionDTO } from './sqe-dtos';
import { HubConnection } from '@microsoft/signalr';

export abstract class NotificationHandler {
    public handleUpdatedEdition(edition: EditionDTO): void {
        // Place logic here
    }
}

export class SignalRUtilities {
    private _connection: HubConnection;

    public constructor(connection: HubConnection) {
        this._connection = connection;
    }

    public connectNotificationHandler(handler: NotificationHandler) {
        console.debug('Connecting notification handler');
        this._connection.on('UpdatedEdition', handler.handleUpdatedEdition);
    }

    public disconnectNotificationHandler(handler: NotificationHandler) {
        this._connection.off('UpdatedEdition', handler.handleUpdatedEdition);
    }

    public async subscribeToEdition(editionId: number): Promise<void> {
        return await this._connection!.invoke('SubscribeToEdition', editionId);
    }

    public async unsubscribeToEdition(editionId: number): Promise<void> {
        return await this._connection!.invoke('UnsubscribeToEdition', editionId);
    }
}
