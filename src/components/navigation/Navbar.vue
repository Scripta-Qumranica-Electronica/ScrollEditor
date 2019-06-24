<template>
  <div>
    <b-navbar toggleable="md" type="dark" variant="dark">
      <b-navbar-brand to="/">Scrollery</b-navbar-brand>

      <b-navbar-nav class="ml-auto"> <!-- Current user -->
        <b-nav-item right v-if="!userName">
          <b-btn @click="login" size="sm">{{ $t('navbar.login') }}</b-btn>
        </b-nav-item>
        <b-nav-item right v-if="!userName">
          <b-btn size="sm">
          <router-link :to="{path: `/registration`}" class="white-link">
              {{ $t('navbar.register') }}
          </router-link>
          </b-btn>
        </b-nav-item>
        <b-nav-item-dropdown v-if="userName" right :text="userName">
          <b-dropdown-item-button @click="logout()">{{ $t('navbar.logout') }}</b-dropdown-item-button>
          <b-dropdown-item-button v-if="activated" @click="changePassword()">{{ $t('navbar.changePassword') }}</b-dropdown-item-button>
        </b-nav-item-dropdown>
  
        <b-nav-item-dropdown right> <!-- Change language -->
          <template slot="button-content">
            <font-awesome-icon icon="language"/>
          </template>
          <b-dropdown-item-button v-for="(texts, language) in localizedTexts" 
                          :key=language
                          @click="changeLanguage(language)">
            {{ texts.display }}
            <span v-if="language===currentLanguage">&#x2714;</span>
          </b-dropdown-item-button>
        </b-nav-item-dropdown>
      </b-navbar-nav>
    </b-navbar>
    <login></login>  <!-- placeholder for login modal -->
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import { mapState } from 'vuex';
import { localizedTexts } from '@/i18n';
import SessionService from '@/services/session';
import Login from './Login.vue';
import router from '../../router';
import { StateManager } from '../../state';


export default Vue.extend({
  name: 'navbar',
  components: {
    Login
  },
  data() {
    return {
      localizedTexts,
      sessionService: new SessionService(),
    };
  },
  computed: {
    currentLanguage(): string {
      const current = this.$state.session.language;
      return current;
    },
    userName(): string | undefined {
      if (this.$state.session.user) {
        return this.$state.session.user.forename + ' ' + this.$state.session.user.surname;
      }
      return undefined;
    },
    activated(): boolean {
      return this.$state.session.user ? this.$state.session.user.activated : false;
    }
  },
  methods: {
    changeLanguage(language: string) {
      this.$i18n.locale = language;
      this.$state.session.language = language;
    },
    login() {
      this.$root.$emit('bv::show::modal', 'loginModal');
    },
    logout() {
      this.sessionService.logout();
      location.reload();
    },
    changePassword() {
      router.push('/changePassword');
    },
  }
});
</script>

<style scoped>
.white-link {
    color: white;
    text-decoration: none;
 }
</style>
