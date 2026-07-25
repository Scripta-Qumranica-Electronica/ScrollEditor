import { describe, it, expect, vi } from 'vitest';
import {
    showModal,
    hideModal,
    registerModalListener,
} from '@/utils/modal-bus';

describe('modal-bus', () => {
    it('invokes onShow for a matching id when showModal fires', () => {
        const onShow = vi.fn();
        const onHide = vi.fn();
        const dispose = registerModalListener('m1', onShow, onHide);

        showModal('m1');
        expect(onShow).toHaveBeenCalledTimes(1);
        expect(onHide).not.toHaveBeenCalled();
        dispose();
    });

    it('invokes onHide for a matching id when hideModal fires', () => {
        const onShow = vi.fn();
        const onHide = vi.fn();
        const dispose = registerModalListener('m2', onShow, onHide);

        hideModal('m2');
        expect(onHide).toHaveBeenCalledTimes(1);
        expect(onShow).not.toHaveBeenCalled();
        dispose();
    });

    it('ignores events for a different id', () => {
        const onShow = vi.fn();
        const onHide = vi.fn();
        const dispose = registerModalListener('mine', onShow, onHide);

        showModal('other');
        hideModal('other');
        expect(onShow).not.toHaveBeenCalled();
        expect(onHide).not.toHaveBeenCalled();
        dispose();
    });

    it('the disposer unsubscribes both handlers', () => {
        const onShow = vi.fn();
        const onHide = vi.fn();
        const dispose = registerModalListener('m3', onShow, onHide);
        dispose();

        showModal('m3');
        hideModal('m3');
        expect(onShow).not.toHaveBeenCalled();
        expect(onHide).not.toHaveBeenCalled();
    });

    it('supports multiple listeners on distinct ids independently', () => {
        const a = vi.fn();
        const b = vi.fn();
        const disposeA = registerModalListener('a', a, vi.fn());
        const disposeB = registerModalListener('b', b, vi.fn());

        showModal('a');
        expect(a).toHaveBeenCalledTimes(1);
        expect(b).not.toHaveBeenCalled();

        disposeA();
        disposeB();
    });

    it('passes the optional payload to onShow (add-line before/after)', () => {
        const onShow = vi.fn();
        const dispose = registerModalListener('addLineModal', onShow, vi.fn());

        showModal('addLineModal', 'after');
        expect(onShow).toHaveBeenCalledWith('after');

        showModal('addLineModal'); // no payload -> undefined, still fires
        expect(onShow).toHaveBeenLastCalledWith(undefined);
        dispose();
    });
});
