<template>
    <div>
        <b-navbar
            toggleable="md"
            id="main-nav-bar"
            active
            type="dark"
            variant="light"
        >
            <!-- Brand -->
            <b-navbar-brand
                to="/"
                align="left"
                id="brand-1"
                class="brand-1 m-0 mt-mb-auto pt-0 pb-0 d-flex flex-row justify-content-between align-items-ceter"
            >
                <img
                    id="brand-icon"
                    class="logo pb-1"
                    src="../../assets/images/favicon-32x32.png"
                />
                <span id="brand-text" class="m-0 p-0 pb-1 d-none d-xl-flex">
                    <router-link to="/home" v-if="isActive">
                        {{ $t('home.brand') }}
                    </router-link>
                    <router-link to="/" v-else>
                        {{ $t('home.brand') }}
                    </router-link>
                </span>
            </b-navbar-brand>

            <!-- Edition navigation -->
            <b-navbar-nav
                v-if="edition"
                class="m-0 mt-mb-auto ml-xl-5 ml-lg-5 ml-md-0 ml-sm-0 d-flex"
            >
                <edition-toolbox />
                <b-nav-item
                    :to="{ path: `/editions/${edition.id}/artefacts` }"
                    active-class=""
                >
                    <span>
                        {{ edition.name }}
                        <b-badge :class="editionBadgeClass">
                            {{ editionBadge }}</b-badge
                        >
                    </span>
                </b-nav-item>
                <b-nav-item :to="`/editions/${edition.id}/scroll-editor/`">
                    Manuscript
                </b-nav-item>
                <b-nav-item :to="artefactLink">{{ artefactLabel }}</b-nav-item>
                <b-nav-item :to="imagedObjectLink">{{
                    imagedObjectLabel
                }}</b-nav-item>
                <!-- <b-nav-item to="/" >Editions</b-nav-item> -->
            </b-navbar-nav>

            <!-- empty navbar just to right-align the rest -->
            <b-navbar-nav class="ml-auto"></b-navbar-nav>

            <b-navbar-nav toggleable class="search-user-nav" align="right">
                <b-nav-item active>
                    <b-button size="sm" variant="outline" class="navbar-button" @click="reportProblemModal">
                        <i
                        class="fa fa-exclamation-triangle"
                            aria-hidden="true"
                            style="font-size: 1.3rem"
                            v-b-tooltip.hover.bottomleft="$t('home.search')"
                        ></i>
                    </b-button>
                </b-nav-item>
                <b-nav-item to="/search" active>
                    <b-button size="sm" variant="outline" class="navbar-button">
                        <i
                            class="fa fa-search fa-2x green-text"
                            aria-hidden="true"
                            style="font-size: 1.3rem"
                            v-b-tooltip.hover.bottomleft="$t('home.search')"
                        ></i>
                    </b-button>
                </b-nav-item>


                <!-- User menu -->
                <b-nav-item-dropdown
                    id="register"
                    right
                    v-b-tooltip.hover.bottomleft="'User Account'"
                >
                    <template slot="button-content" size="xs">
                        <b-button variant="outline" size="sm">
                            <i
                                class="fa fa-user fa-2x green-text"
                                aria-hidden="true"
                                style="font-size: 1.3rem"
                            ></i>
                        </b-button>
                    </template>

                    <b-dropdown-item v-if="userNameExists" class="logout">
                        <b> {{ userName }} </b>
                    </b-dropdown-item>

                    <b-dropdown-item
                        v-if="!isActive"
                        @click="login()"
                        class="logout"
                    >
                        {{ $t('navbar.login') }}
                    </b-dropdown-item>

                    <b-dropdown-item
                        v-if="isActive"
                        @click="logout()"
                        class="logout"
                    >
                        {{ $t('navbar.logout') }}
                    </b-dropdown-item>

                    <b-dropdown-item v-if="isActive" @click="changePassword()">
                        {{ $t('navbar.changePassword') }}
                    </b-dropdown-item>

                    <b-dropdown-item
                        v-if="isActive"
                        @click="updateUserDetails()"
                    >
                        {{ $t('navbar.updateUserDetails') }}
                    </b-dropdown-item>
                </b-nav-item-dropdown>

                <!-- Hamburger Menu -->
                <b-nav-item-dropdown
                    id="hamburger"
                    right
                    text-center
                    class="bm-0 p-0 pl-1 pr-1"
                    no-caret
                >
                    <template slot="button-content" size="xs">
                        <b-icon
                            icon="list"
                            class="border rounded"
                            font-scale="1.6"
                        ></b-icon>
                    </template>

                    <b-dropdown-item
                        id="popover-target-home"
                        placement="left"
                        @click="goHome"
                    >
                        {{ $t('navbar.home') }}
                    </b-dropdown-item>
                    <b-dropdown-item
                        placement="left"
                        @click="goPrivate"
                        v-if="isActive"
                        >{{ $t('home.personalEditions') }}</b-dropdown-item
                    >
                    <b-dropdown-item placement="left" @click="goPublic">{{
                        $t('home.publicEditions')
                    }}</b-dropdown-item>

                    <b-dropdown-divider></b-dropdown-divider>

                    <b-dropdown-item
                        id="popover-target-about"
                        placement="left"
                        @click="goAbout"
                    >
                        {{ $t('navbar.about') }}
                    </b-dropdown-item>

                    <b-dropdown-item
                        id="popover-target-faq"
                        placement="left"
                        @click="showFAQModal"
                    >
                        {{ $t('navbar.faq') }}
                    </b-dropdown-item>
                    <faq-modal />

                    <b-dropdown-item
                        id="popover-target-eula"
                        placement="left"
                        @click="showEulaModal"
                    >
                        {{ $t('navbar.eula') }}
                    </b-dropdown-item>
                    <eula-modal />

                    <b-dropdown-item @click="showCitation">
                        {{ $t('navbar.cite') }}
                    </b-dropdown-item>
                    <citation-modal />

                    <b-dropdown-divider></b-dropdown-divider>
                    <b-dropdown-item placement="left" @click="goGuide">{{
                        $t('home.userGuide')
                    }}</b-dropdown-item>

                    <b-dropdown-divider></b-dropdown-divider>
                    <b-dropdown-item
                        placement="left"
                        @click="reportProblemModal"
                        >{{ $t('home.reportProblem') }}</b-dropdown-item
                    >
                    <report-problem-modal />
                    <b-dropdown-item @click="contactUs">
                        {{ $t('navbar.contactus') }}
                    </b-dropdown-item>
                </b-nav-item-dropdown>
                
            </b-navbar-nav>
        </b-navbar>
        <login></login>
        <register></register>
    </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import { localizedTexts } from '@/i18n';
import SessionService from '@/services/session';
import Login from './Login.vue';
import FaqModal from './Faq-modal.vue';
import EulaModal from './Eula-modal.vue';
import CitationModal from './CitationModal.vue';
// import ScreenSizeAlert from '../../views/home/components/ScreenSizeAlert.vue';
import router from '@/router';
import { EditionInfo } from '../../models/edition';
import { BIcon, BIconSearch, BIconPersonFill, BIconList } from 'bootstrap-vue';
import Registration from '@/views/user/Registration.vue';
import ToolbarIconButton from '../toolbars/toolbar-icon-button.vue';
import EditionToolbox from '../toolbars/edition-toolbox.vue';
import ReportProblemModal from './report-problem-modal.vue';

@Component({
    name: 'navbar',
    components: {
        login: Login,
        'faq-modal': FaqModal,
        'eula-modal': EulaModal,
        'citation-modal': CitationModal,
        'edition-toolbox': EditionToolbox,
        'report-problem-modal': ReportProblemModal,
        register: Registration,
        // 'screen-size-alert': ScreenSizeAlert,
        BIcon,
        BIconSearch,
        BIconPersonFill,
        BIconList,
    },
})
export default class Navbar extends Vue {
    private sessionService = new SessionService();
    private currentLanguage = 'en';
    private allTexts = localizedTexts;

    public get edition() {
        return this.$state.editions.current;
    }

    protected get operationsManager() {
        return this.$state.operationsManager;
    }

    protected get showOperationsManager() {
        return (
            !!this.operationsManager &&
            !!this.edition &&
            !this.edition.permission.readOnly
        );
    }

    protected onUndo() {
        this.operationsManager!.undo();
    }

    protected onRedo() {
        this.operationsManager!.redo();
    }

    public goHome() {
        this.$router.push({ path: '/' });
    }

    public goGuide() {
        window.open(
            'https://sway.office.com/oiGhObqnG1IODSgZ?ref=Link',
            '_blank'
        );
    }

    public goPrivate() {
        this.$router.push({ path: '/home/private' });
    }
    public goPublic() {
        this.$router.push({ path: '/home/public' });
    }

    public goAbout() {
        window.open(' https://www.qumranica.org/', '_blank');
    }

    public showFAQModal() {
        this.$root.$emit('bv::show::modal', 'FaqModal');
    }

    public reportProblemModal() {
        this.$root.$emit('bv::show::modal', 'ReportProblemModal');
    }

    public showEulaModal() {
        this.$root.$emit('bv::show::modal', 'EulaModal');
    }

    public showCitation() {
        this.$root.$emit('bv::show::modal', 'CitationModal');
    }

    public contactUs() {
        location.href = 'mailto:sqe@deadseascrolls.org.il';
    }

    public get editionBadgeClass() {
        if (!this.edition) {
            return '';
        }
        return this.edition.isPublic
            ? 'status-badge-published'
            : 'status-badge-draft';
    }

    public get editionBadge() {
        if (!this.edition) {
            return '';
        }

        return this.edition.isPublic ? 'Published' : 'Draft';
    }

    public get artefactLink() {
        if (this.$state.artefacts.current) {
            return `/editions/${this.edition!.id}/artefacts/${
                this.$state.artefacts.current.id
            }`;
        }
        return `/editions/${this.edition!.id}/artefacts/`;
    }

    public get artefactLabel() {
        return this.$state.artefacts.current ? 'Artefact' : 'Artefacts';
    }

    public get imagedObjectLink() {
        if (this.$state.imagedObjects.current) {
            return `/editions/${
                this.edition!.id
            }/imaged-objects/${encodeURIComponent(
                this.$state.imagedObjects.current.id
            )}`;
        }
        return `/editions/${this.edition!.id}/imaged-objects/`;
    }

    public get imagedObjectLabel() {
        return this.$state.imagedObjects.current
            ? 'Imaged Object'
            : 'Imaged Objects';
    }

    public get userNameExists(): boolean {
        return undefined !== this.userName;
    }

    public get userName(): string | undefined {
        if (this.$state.session.user) {
            return (
                this.$state.session.user.forename +
                ' ' +
                this.$state.session.user.surname
            );
        }
        return undefined;
    }

    public get isActive(): boolean {
        return this.$state.session.user
            ? this.$state.session.user.activated
            : false;
    }

    private get currentEdition(): EditionInfo | null {
        return this.$state.editions.current;
    }

    private changeLanguage(language: string) {
        this.$i18n.locale = language;
        this.$state.session.language = language;
        this.currentLanguage = language;

        // We can't implement currentLanguage as a computed property, because $state.session.language is a getter, and
        // Vue doesn't handle getter changes very well.
    }

    private mounted() {
        this.currentLanguage = this.$state.session.language;
    }

    public logout() {
        this.sessionService.logout();
        router.push('/');
        location.reload();
    }

    public login() {
        this.$root.$emit('bv::show::modal', 'loginModal');
    }

    public changePassword() {
        router.push('/changePassword');
    }

    public updateUserDetails() {
        router.push('/updateUserDetails');
    }
}
</script>

<style lang="scss">
@import '@/assets/styles/_variables.scss';
@import '@/assets/styles/_fonts.scss';

$background: #0a142e;
$foreground: $qumran-white;

/* scoped has to be removed in order to set b-nav-dropdown color  */

#main-nav-bar {
    /* background: #041d5c !important; */
    background: $background !important;

    /* height: 50px; */
    /* height: 3.12rem; */

    #brand-text a {
        color: $foreground !important;
        text-decoration: none;
        font-family: $font-family;
        /* color: #ffffff; */
        /* color: #f3f3f3; */
        letter-spacing: 0em;
        text-align: left;
        vertical-align: center;
        font-weight: 900;
        font-style: italic;
        /* font-size: 20px; */
        font-size: 1.8rem;
    }

    #brand-icon {
        margin-top: 6px;
        margin-right: 1rem;
        /* margin-right: 10px;
        margin-left: 24px; */

        width: 2.1rem;
        height: 2.1rem;
        border-radius: 0.3rem;

        background: $background;
    }

    @media (max-width: 1134px) {
        /* @media (max-width: 1134px ) and (min-width: 768px ) { */

        .navbar-brand.brand-1 > .logo-text,
        .main-nav-bar .space-nav {
            display: none;
        }

        .main-nav-bar .navbar-brand a {
            margin: 0;
            padding: 0;
            padding-right: 1rem;
            width: 4rem;
            height: 2rem;
            display: flex;
            justify-content: center;
            align-content: center;
            align-items: flex-start;
        }

        .navbar-brand > .logo {
            margin: 0;
            padding: 0;

            /* margin-right: 10px;
            margin-left: 24px; */
            width: 2rem;
            height: 2rem;
            /* width: 34px;
            height: 34px;
            border-radius: 5px; */
            background: $background;
            border-radius: 0.3rem;
            display: flex;
            text-align: center;
        }
    }

    .nav-item {
        display: flex;
        align-items: center;

        font-family: $font-family;
        letter-spacing: 0em;
        text-align: left;
        font-weight: 900;
        font-size: 1.1rem;
    }

    button {
        background: transparent;
        color: $foreground !important;
        border-color: $foreground !important;
    }

    /* .main-nav-bar .nav-item a.nav-link , */
    .nav-item .nav-link,
    .nav-item-white,
    .navbar-text {
        color: $foreground !important;

        &.router-link-active {
            color: #007bff !important;
        }
    }

    #hamburger {
        li {
            min-width: 5rem;
        }

        path {
            stroke: $foreground;
        }

        .border {
            border-color: $foreground !important;
        }
    }

    .status-badge {
        font-family: $font-family;
        text-align: center;
        font-size: $font-size-1;
        width: 6.8rem;
        height: 2.958rem;
        line-height: 2rem;
        /* width: 68px;
        height: 29.58px;
        line-height: 20px; */
    }

    .status-badge-draft {
        background-color: $orange !important;
        color: $light-orange !important;
    }

    .status-badge-published {
        background-color: $green !important;
        color: $light-greend !important;
    }

    .router-link-active {
        color: #007bff;
    }

    #popover-target-about {
        white-space: nowrap;
    }

    .popover-body {
        /* margin-right:   17rem; */
        min-width: 5rem;
        min-height: 5rem;

        color: #007bff;
        background-color: white;
    }

    .btn {
        margin-left: 5px;
    }

    .dropdown-menu {
        background: $background !important;
    }

    .dropdown-item {
        color: $foreground !important;

        &:hover {
            color: $background !important;
            background: $foreground !important;
        }
    }

    .dropdown-divider {
        border-color: $foreground !important;
    }
}
</style>
