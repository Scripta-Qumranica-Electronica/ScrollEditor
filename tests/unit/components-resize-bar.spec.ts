import { describe, it, expect, vi, beforeEach } from 'vitest';

// Component-mount unit test for resizeBar. Drives startDrag/onDrag/endDrag/
// setPanelWidths against a mock gridElement and localStorage storageKey, and
// checks mounted() wires the grid handlers + seeds the stored width.

import ResizeBar from '@/components/misc/resizeBar.vue';
import { mountComponent } from './helpers/mount';

function makeGrid(clientWidth = 1000) {
    return {
        clientWidth,
        style: { setProperty: vi.fn() },
        onmousemove: null as any,
        onmouseup: null as any,
    };
}

function mountBar(props: Record<string, any> = {}) {
    return mountComponent(ResizeBar, { props });
}

describe('resizeBar', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    it('startDrag sets isDragging', () => {
        const w = mountBar();
        w.vm.startDrag();
        expect(w.vm.isDragging).toBe(true);
    });

    it('setPanelWidths writes the grid-template-columns property', () => {
        const grid = makeGrid();
        const w = mountBar();
        w.vm.setPanelWidths(grid as any, 60);
        expect(grid.style.setProperty).toHaveBeenCalledWith(
            'grid-template-columns',
            'minmax(200px, 60%) 5px minmax(200px, 40%)'
        );
    });

    it('setPanelWidths is a no-op when grid is falsy', () => {
        const w = mountBar();
        expect(() => w.vm.setPanelWidths(null as any, 60)).not.toThrow();
    });

    it('onDrag returns early when not dragging', () => {
        const grid = makeGrid();
        const w = mountBar({ gridElement: grid });
        w.vm.isDragging = false;
        w.vm.onDrag({ clientX: 500 } as any);
        // setPanelWidths from mounted() ran, but the drag itself did not add another call.
        const callsAfterMount = grid.style.setProperty.mock.calls.length;
        w.vm.onDrag({ clientX: 500 } as any);
        expect(grid.style.setProperty.mock.calls.length).toBe(callsAfterMount);
    });

    it('onDrag computes leftPaneWidth from clientX and repaints the grid', () => {
        const grid = makeGrid(1000);
        const w = mountBar({ gridElement: grid });
        w.vm.isDragging = true;
        w.vm.onDrag({ clientX: 300 } as any);
        expect(w.vm.leftPaneWidth).toBe(30);
        expect(grid.style.setProperty).toHaveBeenLastCalledWith(
            'grid-template-columns',
            'minmax(200px, 30%) 5px minmax(200px, 70%)'
        );
    });

    it('endDrag persists leftPaneWidth to localStorage under storageKey', () => {
        const grid = makeGrid(1000);
        const w = mountBar({ gridElement: grid, storageKey: 'panel-key' });
        w.vm.isDragging = true;
        w.vm.leftPaneWidth = 42;
        w.vm.endDrag();
        expect(w.vm.isDragging).toBe(false);
        expect(localStorage.getItem('panel-key')).toBe('42');
    });

    it('endDrag clears dragging without persisting when storageKey is absent', () => {
        const w = mountBar();
        w.vm.isDragging = true;
        w.vm.leftPaneWidth = 33;
        w.vm.endDrag();
        expect(w.vm.isDragging).toBe(false);
        expect(localStorage.length).toBe(0);
    });

    it('endDrag does nothing when not dragging', () => {
        const w = mountBar({ storageKey: 'k' });
        w.vm.isDragging = false;
        w.vm.endDrag();
        expect(localStorage.getItem('k')).toBeNull();
    });

    it('mounted seeds width from localStorage and wires grid mouse handlers', () => {
        localStorage.setItem('seed-key', '55');
        const grid = makeGrid(1000);
        const w = mountBar({ gridElement: grid, storageKey: 'seed-key' });
        // stored 55 => right pane 45
        expect(grid.style.setProperty).toHaveBeenCalledWith(
            'grid-template-columns',
            'minmax(200px, 55%) 5px minmax(200px, 45%)'
        );
        expect(typeof grid.onmousemove).toBe('function');
        expect(typeof grid.onmouseup).toBe('function');

        // The wired handlers delegate to onDrag / endDrag.
        w.vm.isDragging = true;
        grid.onmousemove({ clientX: 100 });
        expect(w.vm.leftPaneWidth).toBe(10);
        grid.onmouseup();
        expect(w.vm.isDragging).toBe(false);
    });

    it('mounted defaults to 70 when no stored value exists', () => {
        const grid = makeGrid(1000);
        mountBar({ gridElement: grid, storageKey: 'missing' });
        expect(grid.style.setProperty).toHaveBeenCalledWith(
            'grid-template-columns',
            'minmax(200px, 70%) 5px minmax(200px, 30%)'
        );
    });
});
