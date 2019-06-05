<template>
  <div>
    <form>
      <b-row class="mb-3">
        <h4>{{ $t('navbar.registration') }}</h4>
      </b-row>

      <b-row class="mb-3">
        <b-col cols="2">{{ $t('navbar.forename') }}</b-col>
        <b-col cols="2"><b-form-input v-model="forename"></b-form-input></b-col>
      </b-row>

      <b-row class="mb-3">
          <b-col cols="2">{{ $t('navbar.surname') }}</b-col>
          <b-col cols="2"><b-form-input v-model="surname"></b-form-input></b-col>
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
    
      <b-button @click="register" variant="primary" :disabled="disabledReg">
        {{ $t('navbar.register') }}
        <span v-if="waiting">
          <font-awesome-icon icon="spinner" spin></font-awesome-icon>
        </span>
      </b-button>  

      <b-row>
        <b-col class="text-danger">{{errorMessage}}</b-col>
      </b-row>   
    </form>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import SessionService from '@/services/session';
import { ServerError } from '@/services/communications';
import ErrorService from '@/services/error';
import { NewUserRequestDTO } from '../../dtos/user';
import router from '../../router';

export default Vue.extend({
  name: 'registration',
  data() {
    return {
      forename: '',
      surname: '',
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
      return this.password !== this.repassword || !this.forename || !this.surname
      || !this.email || !this.password || !this.repassword || !this.organization || this.waiting;
    },
  },
  methods: {
    async register() {
      const data = {
        forename: this.forename,
        surname: this.surname,
        email: this.email,
        organization: this.organization,
        password: this.password
      } as NewUserRequestDTO;

      try {
        const user = await this.sessionService.register(data);
        router.push('/');
      } catch (err) {
        this.errorMessage = err + '. ' + this.errorService.getErrorMsg(err);
        console.error(err);
      }

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
