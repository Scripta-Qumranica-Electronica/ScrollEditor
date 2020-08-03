<template>
    <div>
        <form>
            <b-row class="mb-3">
                <h4>{{ $t('navbar.registration') }}</h4>
            </b-row>

            <b-row class="mb-3">
                <b-col cols="2">{{ $t('navbar.forename') }}</b-col>
                <b-col cols="3">
                    <b-form-input v-model="forename"  name="forename" size="sm"></b-form-input>
                </b-col>
            </b-row>

            <b-row class="mb-3">
                <b-col cols="2">{{ $t('navbar.surname') }}</b-col>
                <b-col cols="3">
                    <b-form-input v-model="surname"  name="surname" size="sm"></b-form-input>
                </b-col>
            </b-row>

            <b-row class="mb-3">
                <b-col cols="2">{{ $t('navbar.email') }}</b-col>
                <b-col cols="3">
                    <b-form-input v-model="email" type="email" size="sm"></b-form-input>
                </b-col>
            </b-row>

            <b-row class="mb-3">
                <b-col cols="2">{{ $t('navbar.password') }}</b-col>
                <b-col cols="3">
                    <b-form-input v-model="password" type="password" name="password" size="sm"></b-form-input>
                </b-col>
            </b-row>

            <b-row class="mb-3">
                <b-col cols="2">{{ $t('navbar.repassword') }}</b-col>
                <b-col cols="3">
                    <b-form-input v-model="repassword" type="password"  name="repassword" size="sm"></b-form-input>
                </b-col>
            </b-row>

            <b-row class="mb-3">
                <b-col cols="2">{{ $t('navbar.organization') }}</b-col>
                <b-col cols="3">
                    <b-form-input v-model="organization" size="sm"></b-form-input>
                </b-col>
            </b-row>

            <div>
                <b-button @click="register" variant="primary" :disabled="disabledReg" class="btn-register" size="sm">
                    {{ $t('navbar.register') }}
                    <span v-if="waiting">
                        <font-awesome-icon icon="spinner" spin></font-awesome-icon>
                    </span>
                </b-button>
                <span class="text-danger ml-3">{{errorMessage}}</span>
                <span class="text-danger ml-3">{{identicalError}}</span>
            </div>
        </form>
    </div>
</template>

<script lang="ts">
import Vue from 'vue';
import SessionService from '@/services/session';
import ErrorService from '@/services/error';
import { NewUserRequestDTO } from '@/dtos/sqe-dtos';
import router from '@/router';

export default Vue.extend({
    name: 'registration',
    data() {
        return {
            forename: '',
            surname: '',
            email: '',
            password: '',
            repassword: '',
            organization: '',
            errorMessage: '',
            sessionService: new SessionService(),
            errorService: new ErrorService(this),
            waiting: false
        };
    },
    components: {},
    computed: {
        disabledReg(): boolean {
            return (
                this.password !== this.repassword ||
                !this.forename ||
                !this.surname ||
                !this.email ||
                !this.password ||
                !this.repassword ||
                this.waiting
            );
        },
        identicalError(): string {
            if (
                this.password &&
                this.repassword &&
                this.password !== this.repassword
            ) {
                return 'Passwords must be identical';
            }
            return '';
        }
    },
    methods: {
        async register() {
            const data = {
                forename: this.forename,
                surname: this.surname,
                email: this.email,
                organization: this.organization,
                password: this.password
            } as NewUserRequestDTO;
            this.waiting = true;

            try {
                const user = await this.sessionService.register(data);
                router.push('/');
                this.$toasted.show(
                   this.$tc('toasts.activationLink'),
                    {
                        type: 'info',
                        position: 'top-right',
                        duration: 7000
                    }
                );
            } catch (err) {
                this.errorMessage = this.errorService.getErrorMessage(
                    err.response.data
                );
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
