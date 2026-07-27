import { createApp } from 'vue';
// `configureCompat` is provided by @vue/compat at runtime (via the vite alias
// vue -> @vue/compat). @vue/compat ships no types and `vue` does not re-export
// this symbol, so its declaration is provided via a local ambient shim
// (see src/globals.d.ts).
import { configureCompat } from '@vue/compat';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';

// Bootstrap
import { createBootstrap } from 'bootstrap-vue-next';
import * as BootstrapVueNext from 'bootstrap-vue-next';
import 'bootstrap/dist/css/bootstrap.css';
import 'bootstrap-vue-next/dist/bootstrap-vue-next.css';

// Font awesome
import { library } from '@fortawesome/fontawesome-svg-core';
import { faLanguage, faSpinner, faSearch, faRedo, faUndo, faArrowsAlt, faSync, faTrashAlt, faMinus, faPlus, faSquare, faPen,
         faMousePointer, faTrash, faEraser, faArrowDown, faArrowUp, faArrowLeft, faArrowRight, faSortAlphaDown, faSortAlphaUp, faInfo, faFont} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';

// Other plugins
import RenderingOptimizationPlugin from './plugins/rendering-optimization';
// Vue 3 replacement for vue-toasted ($toasted global). See plugins/toasted.ts.
import ToastedPlugin from './plugins/toasted';

// i18n
import { createI18n } from 'vue-i18n';
import { localizedTexts } from './i18n';
import { StateManager } from '@/state';

// TODO(vue3) The following plugins have not yet been ported / verified against
// Vue 3. Component migrators should re-enable and validate these individually:
// import VueLazyload from 'vue-lazyload';         // TODO(vue3) v-lazy usages
// vue-toasted replaced by ./plugins/toasted (registered below as ToastedPlugin).
// import { VueHammer } from 'vue2-hammer';        // removed dep; replace with mitt/native gestures
// import VueShortcuts from 'vue-shortcuts';       // removed dep
// import VueVirtualScroller from 'vue-virtual-scroller';
// import CKEditor from '@ckeditor/ckeditor5-vue';

// MODE 2 (Vue-2 compat) is REQUIRED for now, NOT for our own source (which is
// Vue-3-clean) but because vue-facing-decorator's class components lose
// reactivity under MODE 3 — data updates stop triggering re-renders (verified:
// the artefact editor rendered blank). COMPONENT_V_MODEL: false keeps v-model on
// Vue-3 semantics (modelValue/update:modelValue) so bootstrap-vue-next works.
// Fully removing @vue/compat is blocked on migrating off vue-facing-decorator
// (98 components → <script setup> or an upgrade) — a separate project. The
// residual compat deprecation warnings are harmless shim noise until then.
configureCompat({ MODE: 2, COMPONENT_V_MODEL: false });

const app = createApp(App);

const pinia = createPinia();
app.use(pinia);
app.use(router);

const i18n = createI18n({
    legacy: true,
    locale: 'en',
    messages: localizedTexts,
});
app.use(i18n);

app.use(createBootstrap());

// createBootstrap() registers directives + composables but does NOT globally
// register components. Register every exported B* component so kebab-case tags
// (<b-modal>, <b-button>, ...) resolve app-wide, matching the old
// `Vue.use(BootstrapVue)` behaviour used throughout the templates.
for (const [name, comp] of Object.entries(BootstrapVueNext)) {
    if (/^B[A-Z]/.test(name) && comp && typeof comp === 'object') {
        app.component(name, comp as never);
    }
}

// Rendering optimization plugin ($render global). Ported to a Vue 3 plugin
// shape (install(app)).
app.use(RenderingOptimizationPlugin);
app.use(ToastedPlugin);

library.add(faLanguage, faSpinner, faSearch, faUndo, faRedo, faArrowsAlt, faSync, faTrashAlt, faMinus, faPlus, faInfo, faFont,
            faSquare, faPen, faMousePointer, faEraser, faTrash, faArrowUp, faArrowDown, faArrowLeft, faArrowRight, faSortAlphaUp, faSortAlphaDown );
app.component('font-awesome-icon', FontAwesomeIcon);

// Legacy global: components read `this.$state`.
// The app entry owns singleton construction: accessing StateManager.instance here
// forces state-manager.ts to evaluate (registering the currentState builder and
// building the store) before any component renders or service is constructed.
app.config.globalProperties.$state = StateManager.instance;

app.mount('#app');
