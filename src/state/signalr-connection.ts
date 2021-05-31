import _Vue from 'vue';
import signalR, { LogLevel, HubConnection, HubConnectionBuilder } from '@microsoft/signalr';
import { StateManager } from '@/state';
import { SignalRUtilities } from '@/dtos/sqe-signalr';
import { NotificationHandler } from './notification-handler';

type ConnectionStatus = 'closed' | 'connecting' | 'connected' | 'closing';

export class SignalRWrapper {
    // Manage the SignalR connection. This is a singleton class
    private static _instance: SignalRWrapper;

    private _connection?: HubConnection;
    private _utils?: SignalRUtilities;
    private _currentHandler?: NotificationHandler;
    private _status: ConnectionStatus = 'closed';
    private _subscribedEditionId?: number;

    public static get instance() {
        if (!SignalRWrapper._instance) {
            SignalRWrapper._instance = new SignalRWrapper();
        }

        return SignalRWrapper._instance;
    }

    private constructor() {
        if (!process.env.VUE_APP_SIGNALR_URL) {
            throw new Error('VUE_APP_SIGNALR_URL not defined, please add it to the environment');
        }
    }

    public async subscribeEdition(editionId: number) {
        if (this._subscribedEditionId === editionId) {
            return;
        }

        if (this._status !== 'connected') {
            await this.connect();
        }

        if (this._subscribedEditionId) {
            await this.unsubscribeEdition();
        }

        await this._utils!.subscribeToEdition(editionId);
        this._subscribedEditionId = editionId;
    }

    public async unsubscribeEdition() {
        if (this._status !== 'connected' || !this._subscribedEditionId) {
            return;
        }

        await this._utils!.unsubscribeToEdition(this._subscribedEditionId);
        this._subscribedEditionId = undefined;
    }

    public async userChanged() {
        const subscribed = this._subscribedEditionId;
        await this.disconnect();
        await this.connect();
        if (subscribed) {
            await this.subscribeEdition(subscribed);
        }
    }

    public registerNotificationHandler(handler: NotificationHandler) {
        this.unregisterNotificationHandler();
        this._currentHandler = handler;
        this.connectHandler();
    }

    public unregisterNotificationHandler() {
        if (this._currentHandler && this._utils) {
            this._utils.disconnectUpdatedEdition(this._currentHandler.handleUpdatedEdition);
            this._utils.disconnectCreatedArtefact(this._currentHandler.handleCreatedArtefact);
            this._utils.disconnectDeletedArtefact(this._currentHandler.handleDeletedArtefact);
            this._utils.disconnectUpdatedArtefact(this._currentHandler.handleUpdatedArtefact);
            this._utils.disconnectCreatedRoisBatch(this._currentHandler.handleCreatedRoisBatch);
            this._utils.disconnectEditedRoisBatch(this._currentHandler.handleEditedRoisBatch);
            this._utils.disconnectUpdatedRoisBatch(this._currentHandler.handleUpdatedRoisBatch);
            this._utils.disconnectDeletedRoi(this._currentHandler.handleDeletedRoi);
            this._utils.disconnectCreatedEditor(this._currentHandler.handleCreatedEditor);
            this._utils.disconnectUpdatedSignInterpretation(this._currentHandler.handleUpdatedSignInterpretation);
            this._utils.disconnectUpdatedSignInterpretations(this._currentHandler.handleUpdatedSignInterpretations);
            this._utils.disconnectDeletedSignInterpretation(this._currentHandler.handleDeletedSignInterpretation);
            this._utils.disconnectCreatedSignInterpretation(this._currentHandler.handleCreatedSignInterpretation);
        }
        this._currentHandler = undefined;
    }

    private connectHandler() {
        if (this._utils && this._currentHandler) {
            this._utils.connectUpdatedEdition(this._currentHandler.handleUpdatedEdition);
            this._utils.connectCreatedArtefact(this._currentHandler. handleCreatedArtefact);
            this._utils.connectDeletedArtefact(this._currentHandler.handleDeletedArtefact);
            this._utils.connectUpdatedArtefact(this._currentHandler.handleUpdatedArtefact);
            this._utils.connectCreatedRoisBatch(this._currentHandler.handleCreatedRoisBatch);
            this._utils.connectEditedRoisBatch(this._currentHandler.handleEditedRoisBatch);
            this._utils.connectUpdatedRoisBatch(this._currentHandler.handleUpdatedRoisBatch);
            this._utils.connectDeletedRoi(this._currentHandler.handleDeletedRoi);
            this._utils.connectCreatedEditor(this._currentHandler.handleCreatedEditor);
            this._utils.connectUpdatedSignInterpretation(this._currentHandler.handleUpdatedSignInterpretation);
            this._utils.connectUpdatedSignInterpretations(this._currentHandler.handleUpdatedSignInterpretations);
            this._utils.connectDeletedSignInterpretation(this._currentHandler.handleDeletedSignInterpretation);
            this._utils.connectCreatedSignInterpretation(this._currentHandler.handleCreatedSignInterpretation);
        }
    }

    private async connect() {
        if (this._connection) {
            this._connection.stop();
        }

        this._connection = new HubConnectionBuilder()
            .withUrl(process.env.VUE_APP_SIGNALR_URL!, {
                accessTokenFactory: () => StateManager.instance.session.token || '',
            }).configureLogging(process.env.NODE_ENV === 'development' ? LogLevel.Trace : LogLevel.Error)
            .build();
        this._utils = new SignalRUtilities(this._connection);

        this._status = 'connecting';
        try {
            await this._connection.start();
            this._status = 'connected';
            this._connection!.onclose(this.onConnectionClosed);

            if (this._currentHandler) {
                this.connectHandler();
            }
        } catch (error) {
            console.error("Can't connect to SignalR", error);
            this._status = 'closed';
        }
    }

    private async disconnect() {
        // Note that when removing a listener you must pass a reference to the function
        // the listener was originally created with. You cannot use an anonymous function
        // that happens to do the ssame thing as the (anonymous) function passed in.

        if (this._status === 'connected') {
            this._status = 'closing';
            await this._connection!.stop();
        }

        this._status = 'closed';
        this._subscribedEditionId = undefined;
    }

    private onConnectionClosed(error?: Error) {
        if (this._status !== 'closing') {
            console.warn('SignalR connection closed unexpectedly', error);
        }
        this._status = 'closed';
        this._subscribedEditionId = undefined;
    }
}
