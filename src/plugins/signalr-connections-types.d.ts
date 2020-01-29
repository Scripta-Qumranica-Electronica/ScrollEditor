import Vue from 'vue';
import { SignalRWrapper } from './signalr-connection';

declare module 'vue/types/vue' {
    interface Vue {
        $signalR: SignalRWrapper;
    }
}

