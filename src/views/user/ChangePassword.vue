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
import { Component, Prop, Emit, Vue } from 'vue-property-decorator';

import SessionService from '@/services/session';
import ErrorService from '@/services/error';
import { ResetLoggedInUserPasswordRequestDTO } from '@/dtos/sqe-dtos';
import router from '@/router';


@Component({
  name: 'change-password'

})

export default class ChangePassword extends Vue {

  // data

  protected currentPassword: string = '';
  protected newPassword: string = '';
  protected rePassword: string = '';
  protected errorMessage: string = '';
  protected sessionService: SessionService = new SessionService();
  protected errorService: ErrorService = new ErrorService(this);
  protected waiting: boolean = false;


  // computed
  public get disableChange(): boolean {
      return this.newPassword !== this.rePassword || !this.currentPassword
      || !this.newPassword || !this.rePassword || this.waiting;
  }

  public get identicalError(): string {
    if (this.newPassword && this.rePassword && this.newPassword !== this.rePassword) {
      return 'Passwords must be identical';
    }
    return '';
  }


  // methods
  protected async change() {
        const data = {
            oldPassword: this.currentPassword,
            newPassword: this.newPassword,
        } as ResetLoggedInUserPasswordRequestDTO;
        this.waiting = true;

        try {
          await this.sessionService.changePassword(data);
          router.push('/');
          this.$toasted.show(this.$tc('toasts.passwordChanged'), {
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

</script>

<style scoped>
 form {
    margin: auto;
    margin-top: 20px;
    max-width: 1000px;
  }
</style>
