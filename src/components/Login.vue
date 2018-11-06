 <template>
    <div>
  <b-btn v-b-modal.myModal>{{ $t('navbar.login') }}</b-btn>

  <!-- the modal -->
  <b-modal id="myModal" title="Login">
    <label>{{ $t('navbar.username') }}: </label>
    <input v-model="username">
    <p>Message is: {{ username }}</p>
    
    <label>{{ $t('navbar.password') }}: </label>
    <input v-model="password">
    <p>Message is: {{ password }}</p>
  </b-modal>
  </div>
 </template>

<script lang="ts">
import Vue from 'vue';
import { mapState } from 'vuex';
import { localizedTexts } from '../i18n';
import SessionService from '../services/session';

export default Vue.extend({
name: 'login',
data() {
    return {
      username: 'tal',
      password: 'aaa',
      localizedTexts,
      sessionService: new SessionService(this.$store),
    };
},
computed: {
    currentLanguage(): string {
    const current = this.$store.state.language.language;
    return current;
    },
},
methods: {
    login() {
    this.sessionService.login(this.username, this.password);
    },
}
});
</script>
 