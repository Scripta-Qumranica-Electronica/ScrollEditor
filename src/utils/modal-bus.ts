import mitt from 'mitt';

/*
 * Bridges the legacy bootstrap-vue-2 pattern
 *     this.$root.$emit('bv::show::modal', id)
 * to bootstrap-vue-next, whose modals are controlled by a LOCAL `v-model`
 * boolean and have no global root-event bus (and Vue 3 removed $root.$on).
 *
 * Modal components subscribe by id via registerModalListener() in mounted()
 * (disposing in beforeUnmount()); callers open/close them with showModal()/
 * hideModal(). This is the systemic replacement for the ~30 dead `bv::` emits
 * left as TODO(vue3) by the migration.
 */
type ModalEvents = {
    show: string;
    hide: string;
};

const bus = mitt<ModalEvents>();

export function showModal(id: string): void {
    bus.emit('show', id);
}

export function hideModal(id: string): void {
    bus.emit('hide', id);
}

// Call in a modal component's mounted(); call the returned disposer in
// beforeUnmount(). onShow/onHide flip the component's local `visible` boolean.
export function registerModalListener(
    id: string,
    onShow: () => void,
    onHide: () => void,
): () => void {
    const show = (mid: string) => {
        if (mid === id) {
            onShow();
        }
    };
    const hide = (mid: string) => {
        if (mid === id) {
            onHide();
        }
    };
    bus.on('show', show);
    bus.on('hide', hide);
    return () => {
        bus.off('show', show);
        bus.off('hide', hide);
    };
}
