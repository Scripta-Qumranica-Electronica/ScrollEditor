<template>
  <div>
    <form>
        <b-row class="mb-3">
            <h4>{{ $t('navbar.changeForgottenPassword') }}</h4>
        </b-row>
    
        <b-row class="mb-3">
            <b-col cols="2">{{ $t('navbar.newPassword') }}</b-col>
            <b-col cols="2"><b-form-input v-model="newPassword" type="password"></b-form-input></b-col>
        </b-row>
        
        <b-row class="mb-3">
            <b-col cols="2">{{ $t('navbar.repassword') }}</b-col>
            <b-col cols="2"><b-form-input v-model="rePassword" type="password"></b-form-input></b-col>
        </b-row>

        <b-row>
          <b-col class="text-danger">{{identicalError}}</b-col>
        </b-row>  
    
        <b-button @click="change" variant="primary" :disabled="disableChange">
            {{ $t('navbar.change') }}
            <span v-if="waiting">
                <font-awesome-icon icon="spinner" spin></font-awesome-icon>
            </span>
        </b-button>

        <b-row>
            <b-col class="text-danger">{{ errorMessage }}</b-col>
        </b-row>

        <!--<div class="alert alert-danger" role="alert" :v-if="errorMessage.length>
          {{errorMessage}}
        </div>-->
    </form>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import SessionService from '@/services/session';
import ErrorService from '@/services/error';
import router from '../../router';
import { ResetForgottenUserPasswordRequestDTO } from '../../dtos/user';

export default Vue.extend({
  name: 'change-forgotten-password',
  data() {
    return {
      newPassword: '',
      rePassword: '',
      token: '',
      errorMessage: '',
      sessionService: new SessionService(),
      errorService: new ErrorService(this),
      waiting: false,
    };
  },
  components: {
  },
  computed: {
    disableChange(): boolean {
        return this.newPassword !== this.rePassword
        || !this.newPassword || !this.rePassword || this.waiting;
    },
    identicalError(): string {
      if (this.newPassword && this.rePassword && this.newPassword !== this.rePassword) {
        return 'Passwords must be identical';
      }
      return '';
    }
  },
  mounted() {
    const url  = window.location.href;
    this.token = url.split('token/')[1];
    if (this.token === '') {
      this.errorMessage = 'There is no token in url';
      console.error(this.errorMessage);
    }
  },
  methods: {
    async change() {
      const data = {
        token: this.token,
        password: this.newPassword,
      } as ResetForgottenUserPasswordRequestDTO;
      this.waiting = true;
      try {
        await this.sessionService.changeForgottenPassword(data);
        router.push('/');
        this.$root.$emit('bv::show::modal', 'loginModal');
      } catch (e) {
        this.errorMessage = this.errorService.getErrorMessage(e.response.data);
      } finally {
        this.waiting = false;
      }
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
