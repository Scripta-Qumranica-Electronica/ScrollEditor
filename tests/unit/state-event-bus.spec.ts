import { describe, it, expect, vi } from 'vitest';
import { EventBus } from '@/state/event-bus';

describe('EventBus (mitt facade)', () => {
    it('emit delivers a single-arg payload to on() listeners', () => {
        const bus = new EventBus();
        const cb = vi.fn();
        bus.on('select-artefact', cb);
        bus.emit('select-artefact', 42);
        expect(cb).toHaveBeenCalledTimes(1);
        expect(cb).toHaveBeenCalledWith(42);
    });

    it('emit with no args passes undefined', () => {
        const bus = new EventBus();
        const cb = vi.fn();
        bus.on('roi-changed', cb);
        bus.emit('roi-changed');
        expect(cb).toHaveBeenCalledWith(undefined);
    });

    it('emit with many args passes them as a single array (variadic facade)', () => {
        const bus = new EventBus();
        const cb = vi.fn();
        bus.on('new-operation', cb);
        bus.emit('new-operation', 1, 2, 3);
        expect(cb).toHaveBeenCalledWith([1, 2, 3]);
    });

    it('off removes a specific listener', () => {
        const bus = new EventBus();
        const cb = vi.fn();
        bus.on('select-group', cb);
        bus.off('select-group', cb);
        bus.emit('select-group', 'x');
        expect(cb).not.toHaveBeenCalled();
    });

    it('off with no callback removes all listeners for the event', () => {
        const bus = new EventBus();
        const a = vi.fn();
        const b = vi.fn();
        bus.on('save-group', a);
        bus.on('save-group', b);
        bus.off('save-group');
        bus.emit('save-group', 1);
        expect(a).not.toHaveBeenCalled();
        expect(b).not.toHaveBeenCalled();
    });

    it('multiple listeners on the same event all fire', () => {
        const bus = new EventBus();
        const a = vi.fn();
        const b = vi.fn();
        bus.on('delete-group', a);
        bus.on('delete-group', b);
        bus.emit('delete-group', 7);
        expect(a).toHaveBeenCalledWith(7);
        expect(b).toHaveBeenCalledWith(7);
    });
});
