import Vue from 'vue';
import App from './App.vue';
import router from './router';
// TODO can we add or find a .d.ts file for this?
import VueLazyload from 'vue-lazyload';

// Bootstrap
import BootstrapVue from 'bootstrap-vue';
import 'bootstrap/dist/css/bootstrap.css';
import 'bootstrap-vue/dist/bootstrap-vue.css';

// Font awesome
import { library } from '@fortawesome/fontawesome-svg-core';
import { faLanguage, faSpinner, faSearch, faRedo, faUndo, faArrowsAlt, faSync, faTrashAlt, faMinus, faPlus, faSquare, faPen,
         faMousePointer, faTrash, faEraser, faArrowDown, faArrowUp, faArrowLeft, faArrowRight, faSortAlphaDown, faSortAlphaUp, faInfo, faFont} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';

// Other plugins
import Toasted from 'vue-toasted';
import VueShortcuts from 'vue-shortcuts';
import RenderingOptimizationPlugin from './plugins/rendering-optimization';

// i18n
import VueI18n from 'vue-i18n';
import { localizedTexts } from './i18n';
import { StateManager } from './state';

// vue2-hammer
import { VueHammer } from 'vue2-hammer';
import VueVirtualScroller from 'vue-virtual-scroller';
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';

// tslint:disable-next-line
const CKEditor = require('@ckeditor/ckeditor5-vue');


// import AsyncComputed from 'vue-async-computed';

Vue.config.productionTip = false;

// TODO use a real loading image and add an error image
// TODO do we need a polyfill for Intersection Observer?
Vue.use(VueLazyload, {
  /*error: 'dist/error.png',*/
  loading: require('@/assets/images/rings.svg'),
  observer: true,
  observerOptions: {
    rootMargin: '0px',
    threshold: 0.5
  }
});

Vue.prototype.$state = StateManager.instance;
Vue.use(BootstrapVue);

library.add(faLanguage, faSpinner, faSearch, faUndo, faRedo, faArrowsAlt, faSync, faTrashAlt, faMinus, faPlus, faInfo, faFont,
            faSquare, faPen, faMousePointer, faEraser, faTrash, faArrowUp, faArrowDown, faArrowLeft, faArrowRight, faSortAlphaUp, faSortAlphaDown );
Vue.component('font-awesome-icon', FontAwesomeIcon);

Vue.use(VueI18n);
const i18n = new VueI18n({
  locale: 'en',
  messages: localizedTexts,
});

Vue.use(Toasted);
Vue.use(VueShortcuts, { prevent: ['input'] });
Vue.use(RenderingOptimizationPlugin);

Vue.use(VueHammer);
Vue.use(CKEditor);

Vue.use(VueVirtualScroller);

router.beforeEach((to, from, next) => {
  if (to.matched.some((record) => record.meta.activeUserRoute)) {
    // this route requires activated user
    // if not, redirect to home page.
    if (StateManager.instance.session.user ? StateManager.instance.session.user.activated : false) {
      // We know it's ugly but we do not have a vue instance, and that's how we can know what the value is.
      next();
    } else {
      next({ path: '/' });
    }
  } else {
    next(); // make sure to always call next()!
  }
});

new Vue({
  router,
  i18n,
  render: (h) => h(App),
}).$mount('#app');
