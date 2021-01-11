<template>
  <div>
    <form>
        <b-row class="mb-3">
            <h4>{{ $t('navbar.activateUser') }}</h4>
        </b-row>
        
        <b-button @click="change" variant="primary" class="btn-activate">
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

import { Component, Prop, Emit, Vue } from 'vue-property-decorator';

import SessionService from '@/services/session';
import ErrorService from '@/services/error';
import router from '@/router';
import { ResetForgottenUserPasswordRequestDTO } from '@/dtos/sqe-dtos';



@Component({
     name: 'activation'
})

export default class Activation extends Vue {
 
  // data
  
  protected token: string = '';
  protected errorMessage: string = '';
  protected sessionService: SessionService = new SessionService();
  protected errorService: ErrorService = new ErrorService(this);
  protected waiting: boolean = false;
   
 
  protected mounted() {
    const url  = window.location.href;
    this.token = url.split('token/')[1];
    if (this.token === '') {
      console.error('There is no token in url');
    }
  }

  // methods 
  
    public async change() {
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

</script>

<style scoped>
 form {
    margin: auto;
    margin-top: 20px;
    max-width: 1000px;
  }
</style>
