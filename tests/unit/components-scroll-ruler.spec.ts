import { describe, it, expect } from 'vitest';
import ScrollRuler from '@/views/scroll-editor/scroll-ruler.vue';
import { mountComponent } from './helpers/mount';

function mountRuler(props: any = {}) {
    return mountComponent(ScrollRuler, { props });
}

describe('scroll-ruler', () => {
    it('defaults produce empty tick arrays', () => {
        const w = mountRuler();
        expect(w.vm.horizontalTicksArray).toEqual([]);
        expect(w.vm.verticalTicksArray).toEqual([]);
    });

    it('tick arrays enumerate 0..n-1', () => {
        const w = mountRuler({ horizontalTicks: 3, verticalTicks: 2 });
        expect(w.vm.horizontalTicksArray).toEqual([0, 1, 2]);
        expect(w.vm.verticalTicksArray).toEqual([0, 1]);
    });

    it('renders one li per horizontal + vertical tick', () => {
        const w = mountRuler({ horizontalTicks: 4, verticalTicks: 3 });
        expect(w.findAll('.ruler-bar-horizontal li').length).toBe(4);
        expect(w.findAll('.ruler-bar-vertical li').length).toBe(3);
    });

    it('labels only every 10th tick and marks the others as units', () => {
        const w = mountRuler({ horizontalTicks: 12, verticalTicks: 0 });
        const lis = w.findAll('.ruler-bar-horizontal li');
        // index 0 and 10 carry a span label; others are units
        expect(lis[0].find('span').exists()).toBe(true);
        expect(lis[10].find('span').exists()).toBe(true);
        expect(lis[1].find('span').exists()).toBe(false);
        expect(lis[1].classes()).toContain('units');
        expect(lis[0].classes()).not.toContain('units');
    });

    it('positions ticks using ppm * zoom * index and sets container size', () => {
        const w = mountRuler({ horizontalTicks: 2, ppm: 3, zoom: 2, width: 100, height: 50 });
        const lis = w.findAll('.ruler-bar-horizontal li');
        // index 1 -> left = 3 * 2 * 1 = 6px
        expect(lis[1].attributes('style')).toContain('left: 6px');
        expect(w.find('.ruler').attributes('style')).toContain('height: 50px');
        expect(w.find('.ruler').attributes('style')).toContain('width: 100px');
    });
});
