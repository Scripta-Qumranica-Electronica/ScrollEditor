<template>
  <b-navbar toggleable="md" type="dark" variant="dark">
    <b-navbar-brand to="/">Scrollery</b-navbar-brand>

    <b-navbar-nav>
      <b-nav-item to="/">{{ $t('navbar.home') }}</b-nav-item>
      <b-nav-item to="/about">{{ $t('navbar.about') }}</b-nav-item>
    </b-navbar-nav>
  </b-navbar>
</template>

<script lang="ts">
import Vue from 'vue';

export default Vue.extend({
  name: 'navbar',
});
</script>
