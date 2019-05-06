import Vue from 'vue';
import Router from 'vue-router';
import Home from './views/home/Home.vue';
import Edition from './views/edition/Edition.vue';
import EditionFragments from './views/edition/components/fragments.vue';
import EditionArtefacts from './views/edition/components/artefacts.vue';
import FragmentEditor from './views/fragment-editor/FragmentEditor.vue';

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
      path: '/edition/:id',
      component: Edition,
      children: [{
        path: 'artefacts',
        component: EditionArtefacts,
      },
      {
        path: 'imagedObjects',
        component: EditionFragments,
      },
      {
        path: '',
        redirect: '/edition/:id/imaged-objects',
      }]
    },
    {
      path: '/imaged-boject/:editionId/:fragmentId',
      component: FragmentEditor,
    },
  ],
});
