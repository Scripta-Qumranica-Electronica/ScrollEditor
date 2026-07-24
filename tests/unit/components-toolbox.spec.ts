import { describe, it, expect } from 'vitest';

// Unit test for toolbox. The template has a bare <slot /> which crashes the compat
// renderer under happy-dom (even with explicit slot content), so the `classes`
// computed is exercised directly against a controlled `this` across all branches.

import Toolbox from '@/components/toolbars/toolbox.vue';

const opts: any = Toolbox;
const classesGet = opts.computed.classes.get;

describe('toolbox', () => {
    it('defaults to d-block when hideBelow is xs', () => {
        expect(classesGet.call({ hideBelow: 'xs', noMargins: false })).toEqual(['d-block']);
    });

    it('emits d-none + d-<bp>-block for a real breakpoint', () => {
        expect(classesGet.call({ hideBelow: 'md', noMargins: false })).toEqual(['d-none', 'd-md-block']);
    });

    it('appends no-margins when the noMargins flag is set', () => {
        expect(classesGet.call({ hideBelow: 'lg', noMargins: true }))
            .toEqual(['d-none', 'd-lg-block', 'no-margins']);
    });

    it('appends no-margins in the xs (d-block) branch too', () => {
        expect(classesGet.call({ hideBelow: 'xs', noMargins: true })).toEqual(['d-block', 'no-margins']);
    });

    it('handles every declared breakpoint', () => {
        for (const bp of ['sm', 'md', 'lg', 'xl'] as const) {
            expect(classesGet.call({ hideBelow: bp, noMargins: false }))
                .toEqual(['d-none', `d-${bp}-block`]);
        }
    });
});
