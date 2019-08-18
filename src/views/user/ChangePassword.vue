<template>
  <div>
    <form>
        <b-row class="mb-3">
            <h4>{{ $t('navbar.changePassword') }}</h4>
        </b-row>
        <b-row class="mb-3">
            <b-col cols="2">{{ $t('navbar.currentPassword') }}</b-col>
            <b-col cols="2"><b-form-input v-model="currentPassword" type="password"></b-form-input></b-col>
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
    </form>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import SessionService from '@/services/session';
import ErrorService from '@/services/error';
import { ResetLoggedInUserPasswordRequestDTO } from '../../dtos/sqe-dtos';
import router from '../../router';

export default Vue.extend({
  name: 'change-password',
  data() {
    return {
      currentPassword: '',
      newPassword: '',
      rePassword: '',
      errorMessage: '',
      sessionService: new SessionService(),
      errorService: new ErrorService(this),
      waiting: false,
    };
  },
  computed: {
    disableChange(): boolean {
        return this.newPassword !== this.rePassword || !this.currentPassword
        || !this.newPassword || !this.rePassword || this.waiting;
    },
    identicalError(): string {
      if (this.newPassword && this.rePassword && this.newPassword !== this.rePassword) {
        return 'Passwords must be identical';
      }
      return '';
    }
  },
  methods: {
    async change() {
        const data = {
            oldPassword: this.currentPassword,
            newPassword: this.newPassword,
        } as ResetLoggedInUserPasswordRequestDTO;
        this.waiting = true;

        try {
          await this.sessionService.changePassword(data);
          router.push('/');
          this.$toasted.show('Your password changed', {
              type: 'info',
              position: 'top-right',
              duration: 7000
          });
        } catch (err) {
          this.errorMessage = this.errorService.getErrorMessage(err.response.data);
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
