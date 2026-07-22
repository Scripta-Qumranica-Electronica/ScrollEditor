import { LogLevel, HubConnection, HubConnectionBuilder } from '@microsoft/signalr';
import { StateManager } from '@/state';
import { SignalRUtilities } from '@/dtos/sqe-signalr';
import { NotificationHandler } from './notification-handler';
import { HANDLED_EVENTS, UNHANDLED_EVENTS } from './notification-coverage';

type ConnectionStatus = 'closed' | 'connecting' | 'connected' | 'closing';

interface DispatchEntry {
    event: string;
    fn: (msg: any) => void;
}

function logUnhandledNotification(event: string, msg: unknown): void {
    if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.debug(`[signalr] unhandled notification '${event}'`, msg);
    }
}

function buildDispatch(handler: NotificationHandler): DispatchEntry[] {
    const handled: DispatchEntry[] = HANDLED_EVENTS.map(([event, key]) => ({
        event,
        // Handlers are written to be called unbound (they use module-level
        // state(), never `this` — see the note in notification-handler.ts).
        fn: (handler[key] as unknown) as (msg: any) => void,
    }));
    const unhandled: DispatchEntry[] = UNHANDLED_EVENTS.map((event) => ({
        event,
        fn: (msg: any) => logUnhandledNotification(event, msg),
    }));
    return [...handled, ...unhandled];
}

export class SignalRWrapper {
    // Manage the SignalR connection. This is a singleton class
    private static _instance: SignalRWrapper;

    private _connection?: HubConnection;
    private _utils?: SignalRUtilities;
    private _currentHandler?: NotificationHandler;
    private _dispatch?: DispatchEntry[];
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
        this._dispatch = buildDispatch(handler);
        this.connectHandler();
    }

    public unregisterNotificationHandler() {
        this.disconnectHandlers();
        this._currentHandler = undefined;
        this._dispatch = undefined;
    }

    // Register every dispatch entry on the connection. Handled events reach their
    // NotificationHandler method; the rest reach a dev-only logger. Registering
    // the full set (rather than a hand-picked subset) is what makes coverage gaps
    // visible. Behaviour for the currently-handled events is unchanged: the
    // generated connect* wrappers do exactly `this._connection.on(name, handler)`.
    private connectHandler() {
        if (this._connection && this._dispatch) {
            for (const { event, fn } of this._dispatch) {
                this._connection.on(event, fn);
            }
        }
    }

    private disconnectHandlers() {
        if (this._connection && this._dispatch) {
            for (const { event, fn } of this._dispatch) {
                this._connection.off(event, fn);
            }
        }
    }

    private async connect() {
        if (this._connection) {
            this._connection.stop();
        }

        this._connection = new HubConnectionBuilder()
            .withUrl(process.env.VUE_APP_SIGNALR_URL!, {
                accessTokenFactory: () => StateManager.instance.session.token || '',
                // transport: HttpTransportType.LongPolling, // import HttpTransportType if needed
            }).configureLogging(process.env.NODE_ENV === 'development' ? LogLevel.Debug : LogLevel.Error)
            .withAutomaticReconnect()
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
