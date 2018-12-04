import Vue from 'vue';
import Router from 'vue-router';
import Home from './views/home/Home.vue';
import ScrollVer from './views/scrollver/ScrollVer.vue';
import ScrollVerFragments from './views/scrollver/components/fragments.vue';
import ScrollVerColumns from './views/scrollver/components/columns.vue';
import ScrollVerArtefacts from './views/scrollver/components/artefacts.vue';

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
      path: '/scroll/:id',
      component: ScrollVer,
      children: [{
        path: 'artefacts',
        component: ScrollVerArtefacts,
      },
      {
        path: 'columns',
        component: ScrollVerColumns,
      },
      {
        path: 'fragments',
        component: ScrollVerFragments,
      },
      {
        path: '',
        redirect: '/scroll/:id/fragments',
      }]
    },
  ],
});
