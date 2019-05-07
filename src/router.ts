import Vue from 'vue';
import Router from 'vue-router';
import Home from './views/home/Home.vue';
import Edition from './views/edition/Edition.vue';
import EditionFragments from './views/edition/components/fragments.vue';
import EditionArtefacts from './views/edition/components/artefacts.vue';
import FragmentEditor from './views/fragment-editor/FragmentEditor.vue';
import Registration from './views/user/Registration.vue';
import ChangePassword from './views/user/ChangePassword.vue';
import ChangeForgottenPassword from './views/user/ChangeForgottenPassword.vue';

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
        redirect: '/edition/:id/imagedObjects',
      }]
    },
    {
      path: '/fragment/:editionId/:fragmentId',
      component: FragmentEditor,
    },
    {
      path: '/registration',
      component: Registration,
    },
    {
      path: '/changePassword',
      component: ChangePassword,
    },
    {
      path: '/changeForgottenPassword',
      component: ChangeForgottenPassword,
    },
  ],
});
