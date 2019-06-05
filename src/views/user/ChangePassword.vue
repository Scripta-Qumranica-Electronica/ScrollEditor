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
    
        <b-button @click="change" variant="primary" :disabled="disableChange">
            {{ $t('navbar.change') }}
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
import { ResetLoggedInUserPasswordRequestDTO } from '../../dtos/user';

export default Vue.extend({
  name: 'change-password',
  data() {
    return {
      currentPassword: '',
      newPassword: '',
      rePassword: '',
      errorMessage: '',
      sessionService: new SessionService(this.$store),
      errorService: new ErrorService(this),
      waiting: false,
    };
  },
  computed: {
    disableChange(): boolean {
        return this.newPassword !== this.rePassword || !this.currentPassword
        || !this.newPassword || !this.rePassword || this.waiting;
    },
  },
  methods: {
    async change() {
        const data = {
            oldPassword: this.currentPassword,
            newPassword: this.newPassword,
        } as ResetLoggedInUserPasswordRequestDTO;

        try {
          var a = await this.sessionService.changePassword(data);
        } catch (err) {
          console.error(err);
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