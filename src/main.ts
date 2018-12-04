import Vue from 'vue';
import App from './App.vue';
import router from './router';
import store from './store';
// TODO can we add or find a .d.ts file for this?
import VueLazyload from 'vue-lazyload';

// Bootstrap
import BootstrapVue from 'bootstrap-vue';
import 'bootstrap/dist/css/bootstrap.css';
import 'bootstrap-vue/dist/bootstrap-vue.css';

// Font awesome
import { library } from '@fortawesome/fontawesome-svg-core';
import { faLanguage, faSpinner, faSearch } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';

// i18n
import VueI18n from 'vue-i18n';
import { localizedTexts } from './i18n';

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

Vue.use(BootstrapVue);

library.add(faLanguage, faSpinner, faSearch);
Vue.component('font-awesome-icon', FontAwesomeIcon);

Vue.use(VueI18n);
const i18n = new VueI18n( {
  locale: 'en',
  messages: localizedTexts,
});

new Vue({
  router,
  store,
  i18n,
  render: (h) => h(App),
}).$mount('#app');
