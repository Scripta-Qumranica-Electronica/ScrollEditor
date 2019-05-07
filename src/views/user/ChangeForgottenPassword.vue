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
    
        <b-button @click="change" variant="primary" type="submit" :disabled="disableChange">
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
import router from '../../router';

export default Vue.extend({
  name: 'change-forgotten-password',
  data() {
    return {
      newPassword: '',
      rePassword: '',
      token: '',
      errorMessage: '',
      sessionService: new SessionService(this.$store),
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
  },
  mounted() {
    const url  = window.location.href;
    const token = url.split('token=')[1];
    if (!token) {
      console.error('There is no token in url');
    }
  },
  methods: {
    change() {
      const data = {
        token: this.token,
        password: this.newPassword,
      };
      try {
        this.sessionService.changeForgottenPassword(data);
        router.push('/');
      } catch {
        console.error('changeForgottenPassword failed');
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
