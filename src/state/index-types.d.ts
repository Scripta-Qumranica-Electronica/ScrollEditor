import Vue from 'vue';
import { StateManager } from '.';

declare module 'vue/types/vue' {
    interface Vue {
        $state: StateManager;
    }
}
