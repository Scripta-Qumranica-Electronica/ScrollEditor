import _Vue from 'vue';
import { SignalRSQE } from '@/dtos/sqe-signalr';
import { LogLevel } from '@microsoft/signalr';
import { StateManager } from '@/state';
import { EditionDTO } from '@/dtos/sqe-dtos';

type ConnectionStatus = 'closed' | 'connecting' | 'connected' | 'closing';

export class SignalRWrapper {
    // Manage the SignalR connection. This is a singleton class
    private static _instance: SignalRWrapper;

    private _connection = new SignalRSQE();
    private _status = 'closed';
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
        console.debug('SignalR subscribeEdition called, current status ', this._status);
        if (this._subscribedEditionId === editionId) {
            return;
        }

        if (this._status !== 'connected') {
            await this.connect();
        }

        if (this._subscribedEditionId) {
            await this.unsubscribeEdition();
        }

        await this._connection!.subscribeToEdition(editionId);
        console.debug('SubscribeToEdition called');
        this._subscribedEditionId = editionId;
    }

    public async unsubscribeEdition() {
        console.debug('SignalR unsubscribeEdition, status is ', this._status);
        if (this._status !== 'connected' || !this._subscribedEditionId) {
            return;
        }

        await this._connection!.unsubscribeToEdition(this._subscribedEditionId);
        console.debug('UnsubscribeToEdition called');
        this._subscribedEditionId = undefined;
    }

    public async userChanged() {
        console.debug('SignalR changing users');
        const subscribed = this._subscribedEditionId;
        await this.disconnect();
        await this.connect();
        if (subscribed) {
            await this.subscribeEdition(subscribed);
        }
    }

    private async connect() {
        console.debug('SignalR connect called, current status ', this._status);
        if (this._connection) {
            this._connection.stop();
        }
        this._status = 'connecting';
        try {
            await this._connection.start(process.env.VUE_APP_SIGNALR_URL!,
                process.env.NODE_ENV === 'development' ? LogLevel.Information : LogLevel.Error,
                StateManager.instance.session.token || '');
            this._status = 'connected';
            this._connection.setOnConnectionClosed(this.onConnectionClosed);
            console.debug('SignalR connection opened, status is ', this._status);
            this._connection.onUpdatedEdition(this._updatedEdition);
        } catch (error) {
            console.error("Can't connect to SignalR", error);
            this._status = 'closed';
        }
    }

    private async disconnect() {
        // Note that when removing a listener you must pass a reference to the function
        // the listener was originally created with. You cannot use an anonymous function
        // that happens to do the ssame thing as the (anonymous) function passed in.
        this._connection.offUpdatedEdition(this._updatedEdition);
        console.debug('SignalR disconnect called, current status ', this._status);

        if (this._status === 'connected') {
            this._status = 'closing';
            await this._connection.stop();
        }

        this._status = 'closed';
        this._subscribedEditionId = undefined;
    }

    private onConnectionClosed(error?: Error) {
        console.debug('SignalR onConnectionClosed called ', error);
        if (this._status !== 'closing') {
            console.warn('SignalR connection closed unexpectedly', error);
        }
        this._status = 'closed';
        this._subscribedEditionId = undefined;
    }

    private _updatedEdition = (returnedData: EditionDTO) => {
        console.debug('updated edition');
        console.debug(returnedData);
    }
}

export default function SignalRConnectionPlugin(vue: typeof _Vue, options?: any): void {
    // TODO: Let a function calculate this based on the current browser abilities
    vue.prototype.$signalR = SignalRWrapper.instance;
}
