<template>
  <div>
    <b-navbar toggleable="md" type="dark" variant="dark">
      <b-navbar-brand to="/">Scrollery</b-navbar-brand>

      <b-navbar-nav>
        <b-nav-item to="/">{{ $t('navbar.home') }}</b-nav-item>
        <b-nav-item to="/about">{{ $t('navbar.about') }}</b-nav-item>
      </b-navbar-nav>


      <b-navbar-nav class="ml-auto"> <!-- Current user -->
        <b-nav-item right v-if="!userName">
          <b-btn @click="login" size="sm">{{ $t('navbar.login') }}</b-btn>
        </b-nav-item>
        <b-nav-item-dropdown v-if="userName" right :text="userName">
          <b-dropdown-item-button @click="logout()">{{ $t('navbar.logout') }}</b-dropdown-item-button>
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
import { localizedTexts } from '../i18n';
import SessionService from '../services/session';
import Login from './Login.vue';


export default Vue.extend({
  name: 'navbar',
  components: {
    Login
  },
  data() {
    return {
      localizedTexts,
      sessionService: new SessionService(this.$store),
    };
  },
  computed: {
    currentLanguage(): string {
      const current = this.$store.state.language.language;
      return current;
    },
    userName(): string | undefined {
      return this.$store.state.session.loggedIn ? this.$store.state.session.fullName : undefined;
    }
  },
  methods: {
    changeLanguage(language: string) {
      this.$i18n.locale = language;
      this.$store.dispatch('language/setLanguage', language, { root: true });
    },
    login() {
      this.$root.$emit('bv::show::modal', 'loginModal');
    },
    logout() {
      this.sessionService.logout();
    },
  }
});
</script>
