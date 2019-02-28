import Vue from 'vue';
import Router from 'vue-router';
import Home from './views/home/Home.vue';
import ScrollVer from './views/scrollver/ScrollVer.vue';
import ScrollVerFragments from './views/scrollver/components/fragments.vue';
import ScrollVerArtefacts from './views/scrollver/components/artefacts.vue';
import FragmentEditor from './views/fragment-editor/FragmentEditor.vue';
import Try from './views/Try.vue';

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
        path: 'fragments',
        component: ScrollVerFragments,
      },
      {
        path: '',
        redirect: '/scroll/:id/fragments',
      }]
    },
    {
      path: '/fragment/:scrollVersionId/:fragmentId',
      component: FragmentEditor,
    },
    {
      path: '/try',
      component: Try,
    },
  ],
});
