<template>
  <div id="app" :dir="$t('dir')">
    <navbar></navbar>
    <div v-if="waiting">
      <Waiting></Waiting>
    </div>
    <div v-if="!waiting" class="container-fluid" id="main-container">
      <router-view></router-view>
    </div>
  </div>

  <!-- TODO: Add footer -->
</template>

<script>
import Navbar from '@/components/navigation/Navbar.vue';
import Waiting from '@/components/misc/Waiting.vue';
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
      await session.isTokenValid();
      this.waiting = false;
    },
  }
};
</script>

<style>
#main-container {
  max-height: calc(100vh - 56px);   /* Navbar is 56 pixels high */
  padding: 0px;
}

</style>
