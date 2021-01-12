<template>
    <div>
        <b-navbar toggleable="md" class="navbar">
            <b-navbar-brand to="/" class="navbar-brand"
                ><span>S</span>Scrollery</b-navbar-brand
            >
            <b-nav class="ml-auto">
<!--                <b-nav-item
                    :active="language === currentLanguage"
                    @click="changeLanguage(language)"
                    :key="language"
                    v-for="(texts, language) in allTexts"
                    >{{ texts.display }}</b-nav-item
                > -->

                <b-nav-item-dropdown
                    v-if="userNameExists"
                    :text="userName"
                    id="register"
                    right
                >
                    <b-dropdown-item-button @click="logout()" class="logout">{{
                        $t('navbar.logout')
                    }}</b-dropdown-item-button>
                    <b-dropdown-item-button
                        v-if="isActive"
                        @click="changePassword()"
                        >{{
                            $t('navbar.changePassword')
                        }}</b-dropdown-item-button
                    >
                    <b-dropdown-item-button
                        v-if="isActive"
                        @click="updateUserDetails()"
                        >{{
                            $t('navbar.updateUserDetails')
                        }}</b-dropdown-item-button
                    >

                </b-nav-item-dropdown>
            </b-nav>
        </b-navbar>
    </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import { localizedTexts } from '@/i18n';
import SessionService from '@/services/session';
import Login from './Login.vue';
import router from '@/router';
import { EditionInfo } from '../../models/edition';

@Component({
    name: 'navbar',
    components: { login: Login },
})
export default class Navbar extends Vue {
    private sessionService = new SessionService();
    private currentLanguage = 'en';
    private allTexts = localizedTexts;

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

    private get currentEdition(): EditionInfo | undefined {
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

<style scoped>
.white-link {
    color: white;
    text-decoration: none;
}
.editionId {
    list-style: none;
}
.editionId > a {
    color: white;
}
.navbar {
    background: #0a142e;
    height: 50px;
}
.navbar-light .navbar-brand,
.navbar-light .navbar-brand:hover {
    color: #ffffff;
}
.navbar-brand {
    font-family: Helvetica Neue W01 95 Black;
    letter-spacing: 0em;
    text-align: left;
    font-weight: 900;
    font-style: normal;
    font-size: 20px;
}
.navbar-brand > span {
    margin-right: 10px;
    margin-left: 24px;
    width: 34px;
    height: 34px;
    background: #1e2641;
    border-radius: 5px;
    display: inline-block;
    text-align: center;
}

.navbar .nav-item {
    display: flex;
    align-items: center;
}

.navbar .nav-item:not(:last-child):after {
    content: '|';
    color: #f3f3f3;
}


</style>
