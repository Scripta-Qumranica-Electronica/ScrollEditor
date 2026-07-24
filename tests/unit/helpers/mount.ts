import { mount, type MountingOptions } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import { localizedTexts } from '@/i18n';

// Shared mount helper for component-mount unit tests (@vue/test-utils + happy-dom).
// Provides the real i18n (so `$t` works) and a configurable `$state` mock; stubs the
// custom `toolbar-icon-button` by default. Pass `state` for the component's `this.$state`
// needs, extra `stubs`/`mocks` as required, and `props`.
export const i18n = createI18n({ legacy: true, locale: 'en', messages: localizedTexts });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mountComponent(component: any, opts: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    props?: Record<string, any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    state?: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    stubs?: Record<string, any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mocks?: Record<string, any>;
    shallow?: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    slots?: Record<string, any>;
} = {}) {
    const options: MountingOptions<unknown> = {
        props: opts.props,
        slots: opts.slots,
        shallow: opts.shallow,
        global: {
            plugins: [i18n],
            mocks: { $state: opts.state ?? {}, ...(opts.mocks ?? {}) },
            stubs: { 'toolbar-icon-button': true, ...(opts.stubs ?? {}) },
        },
    };
    return mount(component, options);
}
