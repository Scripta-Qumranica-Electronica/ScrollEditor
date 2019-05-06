import Vue from 'vue';
import Router from 'vue-router';
import Home from './views/home/Home.vue';
import Edition from './views/edition/Edition.vue';
import EditionImagedObjects from './views/edition/components/imaged-objects.vue';
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
      path: '/editions/:id',
      component: Edition,
      children: [{
        path: 'artefacts',
        component: EditionArtefacts,
      },
      {
        path: 'imaged-objects',
        component: EditionImagedObjects,
      },
      {
        path: '',
        redirect: '/editions/:id/imaged-objects',
      }]
    },
    {
      path: '/editions/:editionId/imaged-objects/:fragmentId',
      component: FragmentEditor,
    },
  ],
});
