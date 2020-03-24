<template>
  <div>
    <form>
        <b-row class="mb-3">
            <h4>{{ $t('navbar.confirmInvitation') }}</h4>
        </b-row>
        
        <b-button @click="change" variant="primary">
            {{ $t('navbar.accept') }}
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
import ErrorService from '@/services/error';
import router from '@/router';
import { ResetForgottenUserPasswordRequestDTO } from '@/dtos/sqe-dtos';
import EditionService from '@/services/edition';

export default Vue.extend({
  name: 'confirm-invitation',
  data() {
    return {
      token: '',
      errorMessage: '',
      editionService: new EditionService(),
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
      this.waiting = true;
      try {
        await this.editionService.confirmAddEditionEditor(this.token);
        router.push('/');
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
