import Vue from 'vue';
import Router from 'vue-router';
import Home from './views/home/Home.vue';
import ScrollVer from './views/scrollver/ScrollVer.vue';

Vue.use(Router);

export default new Router({
  mode: 'history',
  base: process.env.BASE_URL,
  routes: [
    {
      path: '/',
      name: 'home',
      component: Home,
    },
    {
      path: '/scroll/:id/:new?',
      component: ScrollVer,
      name: 'scroll-ver',
    },
  ],
});
