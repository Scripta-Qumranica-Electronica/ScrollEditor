import _Vue from 'vue';
import { HubConnectionBuilder, LogLevel, HubConnection } from '@aspnet/signalr';

export class SignalRConnection {
    // Manage the SignalR connection. This is a singleton class
    private static _instance: SignalRConnection;

    private _connection!: HubConnection;

    private constructor() {
        if (!process.env.VUE_APP_SIGNALR_URL) {
            throw new Error('VUE_APP_SIGNALR_URL not defined, please add it to the environment');
        }

        this._connection = new HubConnectionBuilder()
            .withUrl(process.env.VUE_APP_SIGNALR_URL)
            .configureLogging(LogLevel.Information)
            .build();

        this._connection.start();

        // TODO: Add logic to handle disconnections.
    }

    public static get instance() {
        if (!SignalRConnection._instance) {
            SignalRConnection._instance = new SignalRConnection();
        }

        return SignalRConnection._instance;
    }

    public get connection() {
        return this._connection;
    }
}

export default function SignalRConnectionPlugin(vue: typeof _Vue, options?: any): void {
    // TODO: Let a function calculate this based on the current browser abilities
    vue.prototype.$signalR = SignalRConnection.instance.connection;
}
