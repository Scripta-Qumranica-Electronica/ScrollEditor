import Vue from 'vue';
import Router from 'vue-router';
import Home from './views/home/Home.vue';
import Edition from './views/edition/Edition.vue';
import EditionImagedObjects from './views/edition/components/imaged-objects.vue';
import EditionArtefacts from './views/edition/components/artefacts.vue';
import Registration from './views/user/Registration.vue';
import ChangePassword from './views/user/ChangePassword.vue';
import UpdateUser from './views/user/UpdateUser.vue';
import ChangeForgottenPassword from './views/user/ChangeForgottenPassword.vue';
import Activation from './views/user/Activation.vue';
import ImagedObjectEditor from './views/imaged-object-editor/ImagedObjectEditor.vue';
import ArtefactEditor from './views/artefact-editor/artefact-editor.vue';

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
      path: '/editions/:editionId',
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
        redirect: '/editions/:editionId/artefacts',
      }]
    },
    {
      path: '/editions/:editionId/imaged-objects/:imagedObjectId',
      component: ImagedObjectEditor,
    },
    {
      path: '/editions/:editionId/artefacts/:artefactId',
      component: ArtefactEditor
    },
    {
      path: '/registration',
      component: Registration,
    },
    {
      path: '/changePassword',
      component: ChangePassword,
      meta: {activeUserRoute: true}
    },
    {
      path: '/updateUserDetails',
      component: UpdateUser,
      meta: {activeUserRoute: true}
    },
    {
      path: '/changeForgottenPassword/token/:token',
      component: ChangeForgottenPassword,
    },
    {
      path: '/activateUser/token/:token',
      component: Activation,
    },
  ],
});
