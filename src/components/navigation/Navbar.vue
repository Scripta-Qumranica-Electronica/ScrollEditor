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
                class="m-0 mt-mb-auto ms-xl-5 ms-lg-5 ms-md-0 ms-sm-0 d-flex"
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
            <b-navbar-nav class="ms-auto"></b-navbar-nav>

            <b-navbar-nav toggleable class="search-user-nav" align="end">
                <b-nav-item active>
                    <b-button size="sm" variant="outline-secondary" class="navbar-button" @click="reportProblemModal">
                        <i
                        class="fa fa-exclamation-triangle"
                            aria-hidden="true"
                            style="font-size: 1.3rem"
                            v-b-tooltip.hover.bottomleft="'Report Problem'"
                        ></i>
                    </b-button>
                </b-nav-item>
                <b-nav-item to="/search" active>
                    <b-button size="sm" variant="outline-secondary" class="navbar-button">
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
                    v-b-tooltip.hover.bottom="'User Account'"
                >
                    <template v-slot:button-content>
                        <b-button variant="outline-secondary" size="sm">
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
                    class="bm-0 p-0 ps-1 pe-1"
                    no-caret
                >
                    <template v-slot:button-content>
                        <!-- bootstrap-vue-next has no b-icon; use FA bars icon -->
                        <span class="border rounded hamburger-icon">&#9776;</span>
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

                    <b-dropdown-item
                        id="popover-target-eula"
                        placement="left"
                        @click="showEulaModal"
                    >
                        {{ $t('navbar.eula') }}
                    </b-dropdown-item>

                    <b-dropdown-item @click="showCitation">
                        {{ $t('navbar.cite') }}
                    </b-dropdown-item>

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
                    <b-dropdown-item @click="contactUs">
                        {{ $t('navbar.contactus') }}
                    </b-dropdown-item>
                </b-nav-item-dropdown>

            </b-navbar-nav>
        </b-navbar>
        <!-- Modals rendered outside navbar/dropdown to avoid nesting issues -->
        <login ref="loginModal"></login>
        <register></register>
        <faq-modal ref="faqModal" />
        <eula-modal ref="eulaModal" />
        <citation-modal ref="citationModal" />
        <report-problem-modal ref="reportProblemModalRef" />
    </div>
</template>

<script lang="ts">
import { Component, Vue, toNative } from 'vue-facing-decorator';
import { vBTooltip } from 'bootstrap-vue-next';
import { localizedTexts } from '@/i18n';
import SessionService from '@/services/session';
import Login from './Login.vue';
import FaqModal from './Faq-modal.vue';
import EulaModal from './Eula-modal.vue';
import CitationModal from './CitationModal.vue';
// import ScreenSizeAlert from '../../views/home/components/ScreenSizeAlert.vue';
import router from '@/router';
import { EditionInfo } from '../../models/edition';
import Registration from '@/views/user/Registration.vue';
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
    },
    directives: {
        'b-tooltip': vBTooltip,
    },
})
class Navbar extends Vue {
    public sessionService = new SessionService();
    public currentLanguage = 'en';
    public allTexts = localizedTexts;

    public get edition() {
        return this.$state.editions.current;
    }

    public get operationsManager() {
        return this.$state.operationsManager;
    }

    public get showOperationsManager() {
        return (
            !!this.operationsManager &&
            !!this.edition &&
            !this.edition.permission.readOnly
        );
    }

    public onUndo() {
        this.operationsManager!.undo();
    }

    public onRedo() {
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
        (this.$refs.faqModal as any).show();
    }

    public reportProblemModal() {
        (this.$refs.reportProblemModalRef as any).show();
    }

    public showEulaModal() {
        (this.$refs.eulaModal as any).show();
    }

    public showCitation() {
        (this.$refs.citationModal as any).show();
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
        const user = this.$state.session.user;
        if (!user) {
            return undefined;
        }
        // Build from whichever name parts exist; fall back to the email so a user
        // with no forename/surname shows their email instead of the literal
        // "null null" (`null + ' ' + null`).
        const name = [user.forename, user.surname].filter(Boolean).join(' ').trim();
        return name || user.email;
    }

    public get isActive(): boolean {
        return this.$state.session.user
            ? this.$state.session.user.activated
            : false;
    }

    public get currentEdition(): EditionInfo | null {
        return this.$state.editions.current;
    }

    public changeLanguage(language: string) {
        this.$i18n.locale = language;
        this.$state.session.language = language;
        this.currentLanguage = language;

        // We can't implement currentLanguage as a computed property, because $state.session.language is a getter, and
        // Vue doesn't handle getter changes very well.
    }

    public mounted() {
        this.currentLanguage = this.$state.session.language;
    }

    public logout() {
        this.sessionService.logout();
        router.push('/');
        location.reload();
    }

    public login() {
        (this.$refs.loginModal as any).show();
    }

    public changePassword() {
        router.push('/changePassword');
    }

    public updateUserDetails() {
        router.push('/updateUserDetails');
    }
}
export default toNative(Navbar);
</script>

<style lang="scss">
@import '@/assets/styles/_variables.scss';
@import '@/assets/styles/_fonts.scss';

$background: #0a142e;
$foreground: $qumran-white;
// check how merging is made , todo remove this line
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

        .hamburger-icon {
            color: $foreground;
            font-size: 1.6rem;
            padding: 0.1rem 0.3rem;
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

/* The account toggle sits at the very top of the viewport, so its hover tooltip has no room
   above and floating-ui places it BELOW — right where this menu opens. Bootstrap gives the
   tooltip a higher z-index (1080) than the dropdown menu (1000), so the tooltip would cover
   the first menu item. Lift this menu above the tooltip so its items stay clickable. */
#register-menu.dropdown-menu {
    z-index: 1090;
}
</style>
