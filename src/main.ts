import Vue from 'vue';
import App from './App.vue';
import router from './router';
import store from './store';

// Bootstrap
import BootstrapVue from 'bootstrap-vue';
import 'bootstrap/dist/css/bootstrap.css';
import 'bootstrap-vue/dist/bootstrap-vue.css';

// Font awesome
import { library } from '@fortawesome/fontawesome-svg-core';
import { faLanguage } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';

// i18n
import VueI18n from 'vue-i18n';
import { localizedTexts } from './i18n';

Vue.config.productionTip = false;

Vue.use(BootstrapVue);

library.add(faLanguage);
Vue.component('font-awesome-icon', FontAwesomeIcon);

Vue.use(VueI18n);
const i18n = new VueI18n( {
  locale: 'he',
  messages: localizedTexts,
});

new Vue({
  router,
  store,
  i18n,
  render: (h) => h(App),
}).$mount('#app');
