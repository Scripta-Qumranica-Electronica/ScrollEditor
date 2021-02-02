import Vue from 'vue';
import Router from 'vue-router';
import Home from './views/home/Home.vue';
import Search from './views/search/main.vue';
import Welcome from './components/welcome/welcome.vue';
import Edition from './views/edition/Edition.vue';
import EditionImagedObjects from './views/edition/components/imaged-objects.vue';
import EditionArtefacts from './views/edition/components/artefacts.vue';
import ScrollEditor from './views/scroll-editor/scroll-editor.vue';
import Registration from './views/user/Registration.vue';
import ChangePassword from './views/user/ChangePassword.vue';
import UpdateUser from './views/user/UpdateUser.vue';
import ChangeForgottenPassword from './views/user/ChangeForgottenPassword.vue';
import Activation from './views/user/Activation.vue';
import ConfirmInvitation from './views/edition/components/confirm-invitation.vue';
import ArtefactEditor from './views/artefact-editor/artefact-editor.vue';
import ImagedObjectEditor from './views/imaged-object-editor/imaged-object-editor.vue';


Vue.use(Router);

export default new Router({
    mode: 'history',
    base: process.env.BASE_URL,
    routes: [
        {
            path: '/',
            name: 'welcome',
            component: Welcome
        },
        {
            path: '/home',
            name: 'home',
            component: Home
        },
        {
            path: '/search',
            name: 'search',
            component: Search
        },
        {
            path: '/editions/:editionId',
            component: Edition,
            children: [
                {
                    path: 'artefacts',
                    component: EditionArtefacts
                },
                {
                    path: 'imaged-objects',
                    component: EditionImagedObjects
                },

                {
                    path: '',
                    redirect: '/editions/:editionId/artefacts'
                }
            ]
        },
        {
            path: '/editions/:editionId/scroll-editor',
            component: ScrollEditor
        },
        {
            path: '/editions/:editionId/artefacts/:artefactId',
            component: ArtefactEditor
        },
        {
            path: '/editions/:editionId/text-fragments/:textFragmentId',
            component: ArtefactEditor
        },
        {
            path: '/editions/:editionId/imaged-objects/:imagedObjectId',
            component: ImagedObjectEditor
        },
        {
            path: '/accept-invitation/token/:token',
            component: ConfirmInvitation
        },
        {
            path: '/registration',
            component: Registration
        },
        {
            path: '/changePassword',
            component: ChangePassword,
            meta: { activeUserRoute: true }
        },
        {
            path: '/updateUserDetails',
            component: UpdateUser,
            meta: { activeUserRoute: true }
        },
        {
            path: '/changeForgottenPassword/token/:token',
            component: ChangeForgottenPassword
        },
        {
            path: '/activateUser/token/:token',
            component: Activation
        }
    ]
});
