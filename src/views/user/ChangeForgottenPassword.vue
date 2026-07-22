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
import { Component, Prop, Emit, Vue, toNative } from 'vue-facing-decorator';

import SessionService from '@/services/session';
import ErrorService from '@/services/error';
import router from '@/router';
import { ResetForgottenUserPasswordRequestDTO } from '@/dtos/sqe-dtos';

@Component({
     name: 'change-forgotten-password'
})
class ChangeForgottenPassword extends Vue {

  // data
  public newPassword: string = '';
  public rePassword: string = '';
  public token: string = '';
  public errorMessage: string = '';
  public sessionService: SessionService = new SessionService();
  public errorService: ErrorService = new ErrorService(this);
  public waiting: boolean = false;

  // computed
  public get disableChange(): boolean {
        return this.newPassword !== this.rePassword
        || !this.newPassword || !this.rePassword || this.waiting;
  }

  public get identicalError(): string {
      if (this.newPassword && this.rePassword && this.newPassword !== this.rePassword) {
        return 'Passwords must be identical';
      }
      return '';
  }

  public mounted() {
    const url  = window.location.href;
    this.token = url.split('token/')[1];
    if (this.token === '') {
      this.errorMessage = 'There is no token in url';
      console.error(this.errorMessage);
    }
  }

  // methods:
  public async change() {
      const data = {
        token: this.token,
        password: this.newPassword,
      } as ResetForgottenUserPasswordRequestDTO;
      this.waiting = true;
      try {
        await this.sessionService.changeForgottenPassword(data);
        router.push('/');
        // TODO(vue3): open the login modal after redirect — $root.$emit('bv::show::modal') is gone;
        // the Navbar's Login component exposes show() via ref, but is not accessible from here.
      } catch (e: any) {
        this.errorMessage = this.errorService.getErrorMessage(e.response.data);
      } finally {
        this.waiting = false;
      }
  }
}
export default toNative(ChangeForgottenPassword);
</script>

<style scoped>
 form {
    margin: auto;
    margin-top: 20px;
    max-width: 1000px;
  }
</style>
