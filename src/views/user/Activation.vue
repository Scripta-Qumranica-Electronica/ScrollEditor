<template>
  <div>
    <form>
        <b-row class="mb-3">
            <h4>{{ $t('navbar.activateUser') }}</h4>
        </b-row>
        
        <b-button @click="change" variant="primary">
            {{ $t('navbar.activate') }}
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
import ErrorService from '@/services/error';
import router from '../../router';
import { ResetForgottenUserPasswordRequestDTO } from '../../dtos/user';

export default Vue.extend({
  name: 'activation',
  data() {
    return {
      token: '',
      errorMessage: '',
      sessionService: new SessionService(),
      errorService: new ErrorService(this),
      waiting: false,
    };
  },
  mounted() {
    const url  = window.location.href;
    this.token = url.split('token/')[1];
    if (this.token === '') {
      console.error('There is no token in url');
    }
  },
  methods: {
    async change() {
      const data = {
        token: this.token
      } as ResetForgottenUserPasswordRequestDTO;
      this.waiting = true;
      try {
        await this.sessionService.activateUser(data);
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
