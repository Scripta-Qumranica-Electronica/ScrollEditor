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
import 'bootstrap/dist/css/bootstrap.css';
import 'bootstrap-vue-next/dist/bootstrap-vue-next.css';

// Font awesome
import { library } from '@fortawesome/fontawesome-svg-core';
import { faLanguage, faSpinner, faSearch, faRedo, faUndo, faArrowsAlt, faSync, faTrashAlt, faMinus, faPlus, faSquare, faPen,
         faMousePointer, faTrash, faEraser, faArrowDown, faArrowUp, faArrowLeft, faArrowRight, faSortAlphaDown, faSortAlphaUp, faInfo, faFont} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';

// Other plugins
import RenderingOptimizationPlugin from './plugins/rendering-optimization';

// i18n
import { createI18n } from 'vue-i18n';
import { localizedTexts } from './i18n';
import { StateManager } from './state';

// TODO(vue3) The following plugins have not yet been ported / verified against
// Vue 3. Component migrators should re-enable and validate these individually:
// import VueLazyload from 'vue-lazyload';         // TODO(vue3) v-lazy usages
// import Toasted from 'vue-toasted';              // TODO(vue3) $toasted usages
// import { VueHammer } from 'vue2-hammer';        // removed dep; replace with mitt/native gestures
// import VueShortcuts from 'vue-shortcuts';       // removed dep
// import VueVirtualScroller from 'vue-virtual-scroller';
// import CKEditor from '@ckeditor/ckeditor5-vue';

// Enable global Vue 2 compat behavior. Individual components can opt out as
// they are migrated to the Vue 3 idioms.
configureCompat({ MODE: 2 });

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

// Rendering optimization plugin ($render global). Ported to a Vue 3 plugin
// shape (install(app)).
app.use(RenderingOptimizationPlugin);

library.add(faLanguage, faSpinner, faSearch, faUndo, faRedo, faArrowsAlt, faSync, faTrashAlt, faMinus, faPlus, faInfo, faFont,
            faSquare, faPen, faMousePointer, faEraser, faTrash, faArrowUp, faArrowDown, faArrowLeft, faArrowRight, faSortAlphaUp, faSortAlphaDown );
app.component('font-awesome-icon', FontAwesomeIcon);

// Legacy global: components read `this.$state`.
app.config.globalProperties.$state = StateManager.instance;

app.mount('#app');
