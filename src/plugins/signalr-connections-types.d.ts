import Vue from 'vue';
import { HubConnection } from '@aspnet/signalr';

declare module 'vue/types/vue' {
    interface Vue {
        $signalR: HubConnection;
    }
}

