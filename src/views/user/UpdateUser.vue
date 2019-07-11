<template>
  <div>
    <form>
        <b-row class="mb-3">
            <h4>{{ $t('navbar.updateUserDetails') }}</h4>
        </b-row>

        <b-row class="mb-3">
            <b-col cols="3">{{ $t('navbar.enterYourPassword') }}</b-col>
            <b-col cols="2"><b-form-input v-model="password" type="password"></b-form-input></b-col>
        </b-row><br>

        <b-row class="mb-3">
            <b-col cols="3">{{ $t('navbar.forename') }}</b-col>
            <b-col cols="2"><b-form-input v-model="forename"></b-form-input></b-col>
        </b-row>
        
        <b-row class="mb-3">
            <b-col cols="3">{{ $t('navbar.surname') }}</b-col>
            <b-col cols="2"><b-form-input v-model="surname"></b-form-input></b-col>
        </b-row>
        
        <b-row class="mb-3">
            <b-col cols="3">{{ $t('navbar.email') }}</b-col>
            <b-col cols="2"><b-form-input v-model="email" type="email"></b-form-input></b-col>
        </b-row>

        <b-row class="mb-3">
            <b-col cols="3">{{ $t('navbar.organization') }}</b-col>
            <b-col cols="2"><b-form-input v-model="organization"></b-form-input></b-col>
        </b-row>
    
        <b-button @click="change" variant="primary" :disabled="disableChange">
            {{ $t('navbar.update') }}
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
import { UserUpdateRequestDTO } from '../../dtos/user';
import router from '../../router';

export default Vue.extend({
  name: 'update-user',
  data() {
    return {
      password: '',
      surname: this.$state.session.user!.surname,
      forename: this.$state.session.user!.forename,
      email: this.$state.session.user!.email,
      organization: this.$state.session.user!.organization,
      errorMessage: '',
      sessionService: new SessionService(),
      errorService: new ErrorService(this),
      waiting: false,
    };
  },
  computed: {
    disableChange(): boolean {
        return this.password === '' &&
        this.surname === this.$state.session.user!.surname &&
        this.forename === this.$state.session.user!.forename &&
        this.email === this.$state.session.user!.email &&
        this.organization === this.$state.session.user!.organization;
    }
  },
  methods: {
    async change() {
        let emailChanged = false;
        if (this.email !== this.$state.session.user!.email) {
            emailChanged = true;
        }
        const data = {
            password: this.password,
            surname: this.surname,
            forename: this.forename,
            email: this.email,
            organization: this.organization
        } as UserUpdateRequestDTO;
        this.waiting = true;

        try {
          await this.sessionService.updateUser(data);
          router.push('/');

          this.$toasted.show('Your details changed', {
              type: 'info',
              position: 'top-right',
              duration: 7000
          });
          if (emailChanged) {
              this.$toasted.show('An activation link has been sent to your new email', {
              type: 'info',
              position: 'top-right',
             duration: 7000
           });
           // todo: update details in $state, the name in the navbar have to update
          }
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
