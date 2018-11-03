<template>
  <b-navbar toggleable="md" type="dark" variant="dark">
    <b-navbar-brand to="/">Scrollery</b-navbar-brand>

    <b-navbar-nav>
      <b-nav-item to="/">{{ $t('navbar.home') }}</b-nav-item>
      <b-nav-item to="/about">{{ $t('navbar.about') }}</b-nav-item>
    </b-navbar-nav>

    <b-navbar-nav class="ml-auto">
      <b-nav-item-dropdown right>
        <template slot="button-content">
          <font-awesome-icon icon="language"/>
        </template>
        <b-dropdown-item v-for="(texts, language) in localizedTexts" :key=language>
          {{ texts.display }}
        </b-dropdown-item>
      </b-nav-item-dropdown>
      <b-nav-item-dropdown right text="Not logged in">
        <b-dropdown-item>Login</b-dropdown-item>
        <b-dropdown-item>Register</b-dropdown-item>
      </b-nav-item-dropdown>
    </b-navbar-nav>
  </b-navbar>
</template>

<script lang="ts">
import Vue from 'vue';
import { mapState } from 'vuex';
import { localizedTexts } from '../i18n';

export default Vue.extend({
  name: 'navbar',
  data() {
    return {
      localizedTexts,
    };
  },
  computed: {
    language(this:any): string {
      return this.$state.language.language;
    }
  }
});
</script>
