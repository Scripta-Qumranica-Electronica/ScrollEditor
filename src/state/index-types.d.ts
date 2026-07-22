import { StateManager } from '.';

// Vue 3 global-property augmentation. Components read `this.$state`,
// which is registered via `app.config.globalProperties.$state` in main.ts.
declare module 'vue' {
    interface ComponentCustomProperties {
        $state: StateManager;
        // TODO(vue3): vue-toasted has no Vue 3 build; these usages need a
        // replacement (e.g. bootstrap-vue-next toasts). Typed loosely so the
        // remaining call sites compile until they are migrated.
        $toasted: {
            show(message: string, options?: any): any;
            [key: string]: any;
        };
        // TODO(vue3): bootstrap-vue's $bvModal bus was removed in
        // bootstrap-vue-next; migrate these to a boolean v-model on the modal.
        $bvModal: {
            show(id: string): void;
            hide(id: string): void;
            [key: string]: any;
        };
    }
}

export {};
