<template>
    <div>
        <b-navbar toggleable="md" type="dark" variant="dark">
            <b-navbar-brand to="/">Scrollery</b-navbar-brand>

            <b-navbar-nav class="ml-auto">
                <!-- Current user -->
                <b-nav-item right v-if="!userName">
                    <b-btn @click="login" size="sm">{{ $t('navbar.login') }}</b-btn>
                </b-nav-item>
                <b-nav-item right v-if="!userName">
                    <b-btn size="sm">
                        <router-link
                            :to="{path: `/registration`}"
                            class="white-link"
                        >{{ $t('navbar.register') }}</router-link>
                    </b-btn>
                </b-nav-item>
                <b-nav-item-dropdown v-if="userName" right :text="userName">
                    <b-dropdown-item-button @click="logout()">{{ $t('navbar.logout') }}</b-dropdown-item-button>
                    <b-dropdown-item-button
                        v-if="isActive"
                        @click="changePassword()"
                    >{{ $t('navbar.changePassword') }}</b-dropdown-item-button>
                    <b-dropdown-item-button
                        v-if="isActive"
                        @click="updateUserDetails()"
                    >{{ $t('navbar.updateUserDetails') }}</b-dropdown-item-button>
                </b-nav-item-dropdown>

                <b-nav-item-dropdown right id="language">
                    <!-- Change language -->
                    <template slot="button-content">
                        <font-awesome-icon icon="language" />
                    </template>
                    <b-dropdown-item-button class="select-lang"
                        v-for="(texts, language) in allTexts"
                        :key="language"
                        @click="changeLanguage(language)"
                                                       
                    >
                        {{ texts.display }}
                        <span v-if="language===currentLanguage">&#x2714;</span>
                    </b-dropdown-item-button>
                </b-nav-item-dropdown>
            </b-navbar-nav>
        </b-navbar>
        <login></login>
        <!-- placeholder for login modal -->
    </div>
</template>

<script lang="ts">
import { Component, Vue, Watch } from 'vue-property-decorator';
import { localizedTexts } from '@/i18n';
import SessionService from '@/services/session';
import Login from './Login.vue';
import router from '@/router';
import { StateManager } from '@/state';

@Component({
    name: 'navbar',
    components: { login: Login }
})
export default class Navbar extends Vue {
    private sessionService = new SessionService();
    private currentLanguage = 'en';
    private allTexts = localizedTexts;

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

    private login() {
        this.$root.$emit('bv::show::modal', 'loginModal');
    }

    private logout() {
        this.sessionService.logout();
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
</style>
