<template>
  <div id="app">
    <navbar></navbar>
    <div v-if="waiting">
      <Waiting></Waiting>
    </div>
    <div v-if="!waiting" class="container-fluid">
      <router-view></router-view>
    </div>
  </div>
</template>

<script>
import Navbar from '@/components/Navbar.vue';
import Waiting from '@/components/Waiting.vue';
import SessionService from '@/services/session.ts';

export default {
  name: 'app',
  components: {
    Navbar,
    Waiting,
  },
  data() {
    return {
      waiting: true,
    };
  },
  created() {
    // Set the language
    this.$i18n.locale = this.$store.state.language.language;
    this.initializeApp();
  },
  methods: {
    async initializeApp() {
      const session = new SessionService(this.$store);
      await session.isSessionValid();
      this.waiting = false;
    },
  }
};
</script>

<style>
</style>
