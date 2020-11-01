<template>
    <div>
        <b-modal
            header-class="title-header"
            footer-class="title-footer"
            ref="registerModalRef"
            id="registerModal"
            @shown="shown"
        >
            <template v-slot:modal-header>
                <b-row class="mt-3"> 
                    <b-col cols="12">Create a researcher account</b-col>
                </b-row>
            </template>
            <b-container fluid @keyup.enter="register">
                <b-row class="mb-3">
                    <b-col>
                        <b-form-input
                            v-model="forename"
                            name="forename"
                            placeholder="Forename"
                        ></b-form-input>
                    </b-col>
                </b-row>

                <b-row class="mb-3">
                    <b-col>
                        <b-form-input
                            v-model="surname"
                            name="surname"
                            placeholder="Surname"
                        ></b-form-input>
                    </b-col>
                </b-row>

                <b-row class="mb-3">
                    <b-col>
                        <b-form-input
                            v-model="email"
                            type="email"
                            placeholder="Email for verification"
                        ></b-form-input>
                    </b-col>
                </b-row>

                <b-row class="mb-3">
                    <b-col>
                        <b-form-input
                            v-model="password"
                            type="password"
                            name="password"
                            placeholder="Password"
                        ></b-form-input>
                    </b-col>
                </b-row>

                <b-row class="mb-3">
                    <b-col>
                        <b-form-input
                            v-model="repassword"
                            type="password"
                            name="repassword"
                            placeholder="Repeat password"
                        ></b-form-input>
                    </b-col>
                </b-row>

                <b-row class="mb-3">
                    <b-col>
                        <b-form-input
                            v-model="organization"
                            placeholder="Organization"
                        ></b-form-input>
                    </b-col>
                </b-row>
            </b-container>

            <template v-slot:modal-footer>
                <div class="w-100">
                    <b-button
                        @click="register"
                        block
                        variant="primary"
                        class="btn-login-modal"
                       :disabled="disabledReg"
                    >
                        {{ $t('navbar.register') }}
                        <span v-if="waiting">
                            <font-awesome-icon
                                icon="spinner"
                                spin
                            ></font-awesome-icon>
                        </span>
                    </b-button>
                </div>
            </template>
        </b-modal>
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
            waiting: false,
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
        },
    },
    methods: {
        async register() {
            const data = {
                forename: this.forename,
                surname: this.surname,
                email: this.email,
                organization: this.organization,
                password: this.password,
            } as NewUserRequestDTO;
            this.waiting = true;

            try {
                await this.sessionService.register(data);
                router.push('/');
                this.$toasted.show(this.$tc('toasts.activationLink'), {
                    type: 'info',
                    position: 'top-right',
                    duration: 7000,
                });
            } catch (err) {
                this.errorMessage = this.errorService.getErrorMessage(
                    err.response.data
                );
            } finally {
                this.waiting = false;
            }
        },
    },
});
</script>

<style scoped>
form {
    margin: auto;
    margin-top: 20px;
    max-width: 1000px;
}
</style>
