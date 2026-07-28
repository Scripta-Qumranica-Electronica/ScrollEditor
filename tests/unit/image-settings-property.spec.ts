import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { normalizeOpacity } from '@/components/image-settings/types';
import type { ImageSetting } from '@/components/image-settings/types';

// Property-based ("fuzz") test for the image-opacity math behind the multi-layer viewer.
//
// Example-based tests check a handful of hand-picked layer combinations. fast-check instead
// GENERATES hundreds of random ones (any count, any visibility pattern, any opacity) and, if
// it finds an input that breaks an invariant, SHRINKS it to the minimal failing case. This is
// the right tool for a numeric routine like normalizeOpacity: the space is too large to
// enumerate by hand, and a single bad combination (e.g. a division that yields NaN/Infinity)
// is exactly the kind of thing that reaches the SVG/opacity and renders wrong.

const layerArb = fc.record({
    type: fc.string(),
    visible: fc.boolean(),
    opacity: fc.double({ min: 0, max: 1, noNaN: true }),
});

function toSettings(layers: Array<{ type: string; visible: boolean; opacity: number }>): ImageSetting {
    const s: ImageSetting = {};
    layers.forEach((l, i) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        s['layer' + i] = { image: null as any, type: l.type, visible: l.visible, opacity: l.opacity, normalizedOpacity: 0 };
    });
    return s;
}

describe('normalizeOpacity — property-based / fuzz', () => {
    it('every layer ends with a finite normalizedOpacity, and the first visible layer gets 1', () => {
        fc.assert(
            fc.property(fc.array(layerArb, { minLength: 1, maxLength: 8 }), (layers) => {
                const settings = toSettings(layers);
                normalizeOpacity(settings);
                const vals = Object.values(settings);

                // Invariant 1: no NaN / Infinity ever reaches a rendered opacity.
                for (const v of vals) {
                    expect(Number.isFinite(v.normalizedOpacity), `non-finite normalizedOpacity for ${v.type}`).toBe(true);
                }

                // Invariant 2: normalizeOpacity forces a layer visible if none were, and the
                // first visible (bottom) layer is always fully opaque.
                const firstVisible = vals.find((v) => v.visible);
                expect(firstVisible, 'no visible layer after normalization').toBeDefined();
                expect(firstVisible!.normalizedOpacity).toBeCloseTo(1, 10);

                // Invariant 3: a rendered opacity is never negative.
                for (const v of vals) {
                    if (v.visible) {
                        expect(v.normalizedOpacity, `negative opacity for ${v.type}`).toBeGreaterThanOrEqual(0);
                    }
                }
            }),
            { numRuns: 500 },
        );
    });
});
