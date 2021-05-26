<template>
    <div>
        <!-- variant is BG color, type is text color -->

        <b-navbar toggleable="md"
            class="main-nav-bar d-flex flex-row justify-content-between align-items-center"
            variant= "dark" type="light" active
        >

            <b-navbar-brand to="/" align="left"
                class="mt-mb-auto d-flex flex-row justify-content-between">
                <span class="logo">S</span>
                <span class="logo-text m-0 p-0">
                    {{ $t('home.home') }}
                </span>
            </b-navbar-brand >

            <b-navbar-nav class="mt-mb-auto ml-5 d-flex" v-if="edition">
                <b-nav-item :to="{ path: `/editions/${edition.id}/artefacts` }">
                    <span>
                        {{ edition.name }}
                        <b-badge :class="editionBadgeClass"> {{ editionBadge }}</b-badge>
                    </span>
                </b-nav-item>
                <b-nav-item :to="`/editions/${edition.id}/scroll-editor/`">
                    Manuscript
                </b-nav-item>
                <b-nav-item :to="artefactLink">{{ artefactLabel }}</b-nav-item>
                <b-nav-item :to="imagedObjectLink">{{ imagedObjectLabel }}</b-nav-item>
            </b-navbar-nav>

            <b-navbar-nav class="ml-auto mb-auto" align="right">
            </b-navbar-nav>

            <b-navbar-nav
                class="ml-auto mt-mb-auto"
                align="right">

                    <b-nav-item v-if="isActive" to="/search" active>
                            <b-icon
                                icon="search"
                                style="color: #f7f7f7; background-color: #f7f7f7"
                                class="border rounded p-1"
                                font-scale="1.6"
                                v-b-tooltip.hover.bottomleft="$t('home.search')"
                            ></b-icon>
                    </b-nav-item>

                    <b-nav-item-dropdown
                        id="register"
                        right
                        v-b-tooltip.hover.bottomleft="'User Menu'"
                    >
                        <template slot="button-content" size="xs">
                            <b-icon icon="person-fill"
                                style="color: #f7f7f7; background-color: #f7f7f7"
                                class="border rounded"
                                font-scale="1.5"
                            ></b-icon>
                         </template>

                        <b-dropdown-item
                            v-if="userNameExists"
                            class="logout"
                        >
                          <b> {{  $t(userName) }} </b>
                        </b-dropdown-item>

                        <b-dropdown-item
                            @click="logout()"
                            class="logout"
                        >
                            {{ $t('navbar.logout') }}
                        </b-dropdown-item>

                        <b-dropdown-item
                            v-if="isActive"
                            @click="changePassword()"
                        >
                            {{
                                $t('navbar.changePassword')
                            }}
                        </b-dropdown-item >

                        <b-dropdown-item
                            v-if="isActive"
                            @click="updateUserDetails()"
                        >
                            {{
                                $t('navbar.updateUserDetails')
                            }}
                        </b-dropdown-item>
                    </b-nav-item-dropdown>
            </b-navbar-nav>


            <b-navbar-nav toggleable>

                <b-nav-item-dropdown
                    id="list-nav" right
                    text-center
                    v-b-tooltip.hover.bottomleft="$t('navbar.about')"
                    class="bm-0 p-0 pl-1 pr-1"
                    no-caret
                >
                    <template slot="button-content" size="xs">
                        <b-icon icon="list"
                            style="background-color: #f7f7f7"
                            class="border rounded"
                            font-scale="1.6"
                        ></b-icon>
                    </template>

                    <b-dropdown-item
                        id="popover-target-about"
                        placement="left"
                        @click="showAboutModal"
                    >
                        {{ $t('navbar.about') }}
                    </b-dropdown-item>
                    <about-modal></about-modal>

                    <b-dropdown-divider></b-dropdown-divider>

                    <b-dropdown-item
                        v-if="showOperationsManager"
                        :disabled="!operationsManager.canUndo" @click="onUndo()"
                    >
                        {{
                            $t('home.undo')
                        }}
                    </b-dropdown-item >

                    <b-dropdown-item
                        v-if="showOperationsManager"
                        :disabled="!operationsManager.canRedo" @click="onRedo()"
                    >
                        {{
                            $t('home.redo')
                        }}
                    </b-dropdown-item>
                 </b-nav-item-dropdown>
            </b-navbar-nav>

        </b-navbar>

    </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import { localizedTexts } from '@/i18n';
import SessionService from '@/services/session';
import Login from './Login.vue';
import AboutModal from './About-modal.vue';
import router from '@/router';
import { EditionInfo } from '../../models/edition';
import { BIcon, BIconSearch , BIconPersonFill, BIconList} from 'bootstrap-vue';

@Component({
    name: 'navbar',
    components: {
        login: Login,
        'about-modal': AboutModal,
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

    protected get edition() {
        return this.$state.editions.current;
    }

    protected get operationsManager() {
        return this.$state.operationsManager;
    }

    protected get showOperationsManager() {
        return !!this.operationsManager && !!this.edition && !this.edition.permission.readOnly;
    }

    protected onUndo() {
        this.operationsManager!.undo();
    }

    protected onRedo() {
        this.operationsManager!.redo();
    }

    private showAboutModal() {
        this.$root.$emit('bv::show::modal', 'AboutModal');
    }

    protected get editionBadgeClass() {
        if (!this.edition) {
            return '';
        }
        return this.edition.isPublic ? 'status-badge-published' : 'status-badge-draft';
    }

    protected get editionBadge() {
        if (!this.edition) {
            return '';
        }

        return this.edition.isPublic ? 'Published' : 'Draft';
    }

    private get artefactLink() {
        if (this.$state.artefacts.current) {
            return `/editions/${this.edition!.id}/artefacts/${this.$state.artefacts.current.id}`;
        }
        return `/editions/${this.edition!.id}/artefacts/`;
    }

    private get artefactLabel() {
        return this.$state.artefacts.current ? 'Artefact' : 'Artefacts';
    }

    private get imagedObjectLink() {
        if (this.$state.imagedObjects.current) {
            return `/editions/${this.edition!.id}/imaged-objects/${this.$state.imagedObjects.current.id}`;
        }
        return `/editions/${this.edition!.id}/imaged-objects/`;
    }

    private get imagedObjectLabel() {
        return this.$state.imagedObjects.current ? 'Imaged Object' : 'Imaged Objects';
    }

    protected userNameExists(): boolean {
        return ( undefined !== this.userName );
    }

    private get userName(): string | undefined {
        if (this.$state.session.user) {
            return (
                this.$state.session.user.forename +
                ' ' +
                this.$state.session.user.surname
            );
        }
        return undefined;
    }

    private get isActive(): boolean {
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

    private logout() {
        this.sessionService.logout();
        router.push('/');
        location.reload();
    }

    private changePassword() {
        router.push('/changePassword');
    }

    private updateUserDetails() {
        router.push('/updateUserDetails');
    }
}
</script>


<style lang="scss" >
@import '@/assets/styles/_variables.scss';
@import '@/assets/styles/_fonts.scss';

/* scoped has to be removed in order to set b-nav-dropdown color  */

.white-link {
    /* color: white; */
    color: #f3f3f3 !important;
    text-decoration: none;
}

.main-nav-bar.navbar {
    background: #0a142e;
    height: 50px;
}


.navbar-brand,
.navbar-brand:hover {
    /* color: #ffffff; */
    /* color: #134ff5 !important; */
    /* color: #8253f0 !important; */
    /* BootstrapVue Primary color */
    color: #0275d8 !important;
}

.navbar-brand {
    /* font-family: Helvetica Neue W01 95 Black; */
    font-family: $font-family;
    /* color: #ffffff; */
    /* color: #f3f3f3; */
    letter-spacing: 0em;
    text-align: left;
    font-weight: 900;
    font-style: italic;
    /* font-size: 20px; */
    font-size: 2.2rem;
}

/* .navbar-brand > span { */
.navbar-brand > .logo {
    margin-right: 10px;
    margin-left: 24px;
    width: 34px;
    height: 34px;
    background: #1e2641;
    border-radius: 5px;
    display: inline-block;
    text-align: center;
}


@media (max-width: 1100px) {
    .navbar-brand > .logo-text {
       display: none;
    }
}


.main-nav-bar.navbar .nav-item {
    display: flex;
    align-items: center;

    font-family: $font-family;
    letter-spacing: 0em;
    text-align: left;
    font-weight: 900;
    font-size: 1.1rem;
}

/* .main-nav-bar .nav-item a.nav-link , */
.main-nav-bar .nav-item  .nav-link,
.nav-item-white,
.navbar-text
{
     color: #f3f3f3  !important;
}

.main-nav-bar .nav-item:not(:last-child):after {
    content: '|';
    color: #f3f3f3;
}

#list-nav ul,
#list-nav ul li ,
#list-nav ul li .dropdown-item  {
   min-width: 5rem;

}




.status-badge {
    font-family: $font-family;
    text-align: center;
    font-size: $font-size-1;
    width: 68px;
    height: 29.58px;
    line-height: 20px;
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
</style>
