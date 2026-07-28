import { config } from '@vue/test-utils';

// Under the old `vue -> @vue/compat` alias, @vue/test-utils resolved to the compat
// build, whose stubs rendered their default slot content. On real Vue 3 stubs do NOT
// render their default slot by default — which hid slotted markup (e.g. a <label> inside
// a stubbed <router-link>) and broke ~two dozen "renders …" assertions. Restore the
// previous behaviour globally so a `stubs: { 'router-link': true }` still renders its
// children.
config.global.renderStubDefaultSlot = true;
