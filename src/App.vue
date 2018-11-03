<template>
  <div id="app">
    <navbar></navbar>
    <div class="container-fluid">
      <router-view></router-view>
    </div>
  </div>
</template>

<script>
import Navbar from '@/views/Navbar.vue';

export default {
  name: 'app',
  components: {
    Navbar,
  },
  methods: {
    mount() {
      // Restore language based on the value in the store
      this.$i18n.locale = this.$store.state.language.language;
    }
  }
};
</script>

<style>
</style>
