import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import RotateButton from '@/components/toolbars/rotate-button.vue';
import { mountComponent, i18n } from './helpers/mount';

// First component-mount unit test (via @vue/test-utils, happy-dom). Covers the
// rotate-button script: the title/icon getters for both directions and the
// press-and-hold repeat timer (onMouseDown/onMouseUp/onMouseLeave/stopRepeat/emitClick).
// The child toolbar-icon-button is stubbed — we exercise this component's own logic.

function mountButton(direction: 'left' | 'right', repeatDelay = 300) {
    return mountComponent(RotateButton, { props: { direction, repeatDelay } });
}

describe('rotate-button', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('exposes left-direction title + icon', () => {
        const w = mountButton('left');
        expect(w.vm.title).toBe(i18n.global.t('misc.leftRotate'));
        expect(w.vm.icon).toBe('undo');
    });

    it('exposes right-direction title + icon', () => {
        const w = mountButton('right');
        expect(w.vm.title).toBe(i18n.global.t('misc.rightRotate'));
        expect(w.vm.icon).toBe('redo');
    });

    it('emits a click', () => {
        const w = mountButton('right');
        w.vm.emitClick();
        expect(w.emitted('click')).toBeTruthy();
    });

    it('press-and-hold repeats click every repeatDelay, and stops on mouse up', () => {
        const w = mountButton('right', 100);
        w.vm.onMouseDown();
        expect(w.vm.pressed).toBe(true);
        vi.advanceTimersByTime(350); // 3 repeats
        expect((w.emitted('click') || []).length).toBe(3);

        w.vm.onMouseUp();
        expect(w.vm.pressed).toBe(false);
        vi.advanceTimersByTime(300); // no more repeats after release
        expect((w.emitted('click') || []).length).toBe(3);
    });

    it('ignores a second mouse-down while already pressed', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        const w = mountButton('left', 100);
        w.vm.onMouseDown();
        w.vm.onMouseDown(); // ignored
        expect(warn).toHaveBeenCalled();
        w.vm.stopRepeat();
        warn.mockRestore();
    });

    it('stopRepeat is a no-op when not pressed (focus-without-mousedown case)', () => {
        const w = mountButton('left');
        expect(() => w.vm.onMouseLeave()).not.toThrow();
        expect(w.vm.pressed).toBe(false);
    });
});
