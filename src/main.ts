import { createApp } from 'vue';
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

// @vue/compat removed: the app now runs on real Vue 3. Our source is Vue-3-clean
// and vue-facing-decorator v4 is Vue-3-native. (The earlier MODE-3 reactivity break
// was a @vue/compat-build quirk, not a real-Vue-3 problem — using real `vue` avoids it.)

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
