import Vue from 'vue';
import { StateManager } from '.';
import StateService from './state-service';

declare module 'vue/types/vue' {
    interface Vue {
        $state: StateManager;
    }
}
