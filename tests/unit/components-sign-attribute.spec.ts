import { describe, it, expect } from 'vitest';

// Component-mount unit test for sign-attribute. Exercises onClick -> attributeClick
// (@Emit) which emits the attribute back to the parent.

import SignAttribute from '@/components/sign-attributes/sign-attribute.vue';
import { mountComponent } from './helpers/mount';

function mountAttr(attribute: any) {
    return mountComponent(SignAttribute, {
        props: { attribute },
        state: { artefactEditor: { highlightCommentMode: false } },
        stubs: { 'sign-attribute-badge': true },
    });
}

describe('sign-attribute', () => {
    it('onClick emits attributeClick with the attribute', () => {
        const attribute = { attributeString: 'x', attributeValueString: 'y' };
        const w = mountAttr(attribute);
        w.vm.onClick();
        expect(w.emitted('attributeClick')![0][0]).toStrictEqual(attribute);
    });

    it('clicking the element triggers the emit', async () => {
        const attribute = { attributeString: 'a' };
        const w = mountAttr(attribute);
        await w.find('.attribute').trigger('click');
        expect(w.emitted('attributeClick')).toBeTruthy();
    });
});
