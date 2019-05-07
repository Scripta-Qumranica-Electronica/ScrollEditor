<template>
  <div>
    <form>
      <b-row class="mb-3">
        <h4>{{ $t('navbar.registration') }}</h4>
      </b-row>

      <b-row class="mb-3">
        <b-col cols="2">{{ $t('navbar.username') }}</b-col>
        <b-col cols="2"><b-form-input v-model="username"></b-form-input></b-col>
      </b-row>

      <b-row class="mb-3">
          <b-col cols="2">{{ $t('navbar.fullName') }}</b-col>
          <b-col cols="2"><b-form-input v-model="fullName"></b-form-input></b-col>
      </b-row>
      
      <b-row class="mb-3">
          <b-col cols="2">{{ $t('navbar.email') }}</b-col>
          <b-col cols="2"><b-form-input v-model="email" type="email"></b-form-input></b-col>
      </b-row>
      
      <b-row class="mb-3">
          <b-col cols="2">{{ $t('navbar.password') }}</b-col>
          <b-col cols="2"><b-form-input v-model="password" type="password"></b-form-input></b-col>
      </b-row>
      
      <b-row class="mb-3">
          <b-col cols="2">{{ $t('navbar.repassword') }}</b-col>
          <b-col cols="2"><b-form-input v-model="repassword" type="password"></b-form-input></b-col>
      </b-row>
      
      <b-row class="mb-3">
          <b-col cols="2">{{ $t('navbar.organization') }}</b-col>
          <b-col cols="2"><b-form-input v-model="organization"></b-form-input></b-col>
      </b-row>
    
      <b-button @click="register" variant="primary" type="submit" :disabled="disabledReg">
        {{ $t('navbar.register') }}
        <span v-if="waiting">
          <font-awesome-icon icon="spinner" spin></font-awesome-icon>
        </span>
      </b-button>     
    </form>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import SessionService from '@/services/session';
import { ServerError } from '@/services/communications';
import ErrorService from '@/services/error';

export default Vue.extend({
  name: 'registration',
  data() {
    return {
      username: '',
      fullName: '',
      email: '',
      password: '',
      repassword: '',
      organization: '',
      errorMessage: '',
      sessionService: new SessionService(this.$store),
      errorService: new ErrorService(this),
      waiting: false,
    };
  },
  components: {
  },
  computed: {
    disabledReg(): boolean {
      return this.password !== this.repassword || !this.username || !this.fullName
      || !this.email || !this.password || !this.repassword || !this.organization || this.waiting;
    },
  },
  methods: {
    register() {
      const data = {
        userName: this.username,
        fullName: this.fullName,
        email: this.email,
        organization: this.organization,
        password: this.password
      };
      this.sessionService.register(data);
      // todo: login this user
    }
  }
});
</script>

<style scoped>
  form {
    margin: auto;
    margin-top: 20px;
    max-width: 1000px;
  }
</style>
