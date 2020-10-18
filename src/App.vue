<template>
  <div id="app" :dir="$t('dir')">
    <navbar v-if="!waiting"></navbar>
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
import { StateManager } from './state';

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
    this.$i18n.locale = this.$state.session.language;
    this.initializeApp();
  },
  methods: {
    async initializeApp() {
      const session = new SessionService();
      await session.isTokenValid();
      this.waiting = false;
    },
  }
};
</script>

<style>
@font-face {
    font-family: 'SBL Hebrew';
    src: url('./assets/fonts/SBL_Hbrw.woff') format('woff');
    font-weight: normal;
    font-style: normal;
}

@font-face {
  font-family: 'AvenirLTStd-Light';
  src: url('./assets/fonts/AvenirLTStd-Light.woff') format('woff');
  font-weight: normal;
  font-style: normal;
}

#main-container {
  max-height: calc(100vh - 56px);   /* Navbar is 56 pixels high */
  padding: 0px;
  background-color: #E5E5E5;
}

</style>
