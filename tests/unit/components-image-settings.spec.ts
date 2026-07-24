import { describe, it, expect, vi, beforeEach } from 'vitest';

// Component-mount unit test for image-settings and its types helper. Exercises
// onSingleImageSettingChanged (normalizes opacity + re-emits) and the
// normalizeOpacity algorithm (single/multiple visible, and the "none visible"
// fallback that forces the first image visible).

import ImageSettings from '@/components/image-settings/ImageSettings.vue';
import { normalizeOpacity } from '@/components/image-settings/types';
import { mountComponent } from './helpers/mount';

function makeSetting(over: any = {}) {
    return { image: { url: 'u' }, type: 't', visible: true, opacity: 1, normalizedOpacity: 1, ...over };
}

function mountSettings(imageSettings: any) {
    return mountComponent(ImageSettings, {
        props: {
            imageStack: { availableImageTypes: Object.keys(imageSettings) },
            params: { imageSettings },
        },
        stubs: { 'single-image-setting': true },
    });
}

describe('image-settings', () => {
    beforeEach(() => vi.clearAllMocks());

    it('onSingleImageSettingChanged normalizes opacity then emits image-setting-changed', () => {
        const imageSettings = { master: makeSetting() };
        const w = mountSettings(imageSettings);
        w.vm.onSingleImageSettingChanged(imageSettings.master as any);
        expect(w.emitted('image-setting-changed')).toBeTruthy();
        expect(w.emitted('image-setting-changed')![0][0]).toStrictEqual(imageSettings);
        // single visible image is normalized to full opacity
        expect(imageSettings.master.normalizedOpacity).toBe(1);
    });
});

describe('normalizeOpacity', () => {
    it('sets the first (and only) visible image to full normalized opacity', () => {
        const s = { a: makeSetting({ opacity: 0.4, normalizedOpacity: 0 }) };
        normalizeOpacity(s as any);
        expect(s.a.normalizedOpacity).toBe(1);
    });

    it('forces the first image visible when none are visible', () => {
        const s = {
            a: makeSetting({ visible: false, opacity: 0.5 }),
            b: makeSetting({ visible: false, opacity: 0.5 }),
        };
        normalizeOpacity(s as any);
        expect(s.a.visible).toBe(true);
        expect(s.a.normalizedOpacity).toBe(1);
    });

    it('blends normalized opacity across multiple visible images', () => {
        const s = {
            a: makeSetting({ opacity: 1 }),
            b: makeSetting({ opacity: 0.5 }),
        };
        normalizeOpacity(s as any);
        expect(s.a.normalizedOpacity).toBe(1);
        // second image gets a fractional blended opacity in (0,1)
        expect(s.b.normalizedOpacity).toBeGreaterThan(0);
        expect(s.b.normalizedOpacity).toBeLessThan(1);
    });
});
