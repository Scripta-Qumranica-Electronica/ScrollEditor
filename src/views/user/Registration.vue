<template>
    <div>
        <b-modal
            header-class="title-header"
            footer-class="title-footer"
            ref="registerModalRef"
            id="registerModal"
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

                <b-row class="mb-3">
                    <b-col>
                        <b-checkbox v-model="termsOfUse">I have read and accept the <b-link href="#"  @click="showTermsOfUse">Terms of Use</b-link>.</b-checkbox>
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
import { Component, Prop, Emit, Vue } from 'vue-property-decorator';

import SessionService from '@/services/session';
import ErrorService from '@/services/error';
import { NewUserRequestDTO } from '@/dtos/sqe-dtos';
import router from '@/router';



@Component({
    name: 'registration',
})

export default class Registration extends Vue {

    // data

    protected forename: string = '';
    protected surname: string = '';
    protected email: string = '';
    protected password: string = '';
    protected repassword: string = '';
    protected organization: string = '';
    protected errorMessage: string = '';
    protected sessionService: SessionService = new SessionService();
    protected errorService: ErrorService = new ErrorService(this);
    protected waiting: boolean = false;
    protected termsOfUse: boolean = false;


    // computed

    public get disabledReg(): boolean {
        return (
            this.password !== this.repassword ||
            !this.forename ||
            !this.surname ||
            !this.email ||
            !this.password ||
            !this.repassword ||
            !this.termsOfUse ||
            this.waiting
        );
    }

    public get identicalError(): string {
        if (
            this.password &&
            this.repassword &&
            this.password !== this.repassword
        ) {
            return 'Passwords must be identical';
        }
        return '';
    }

    protected showTermsOfUse() {
        this.$root.$emit('bv::show::modal', 'EulaModal');
    }

    // methods
    protected async register() {
        const data = {
            forename: this.forename,
            surname: this.surname,
            email: this.email,
            organization: this.organization,
            password: this.password,
        } as NewUserRequestDTO;
        this.waiting = true;

        try {
            const userInfo = await this.sessionService.register(data);

            // this causes
            // vue-router.esm.js?8c4f:2008 Uncaught (in promise)
            // NavigationDuplicated: Avoided redundant navigation to current
            // location: "/".
            // Also no need, since login will be done from adtivation page.

            // router.push('/');
            // this.$router.push('/');

            this.$toasted.show(this.$tc('toasts.activationLink'), {
                type: 'info',
                position: 'top-right',
                duration: 9000, // was 7000
            });
        } catch (err) {
            this.errorMessage = this.errorService.getErrorMessage(
                err.response.data
            );
        } finally {
            this.waiting = false;

            // Close modal window,
            // But the login will be done from the activation page.
            (this.$refs.registerModalRef as any).hide();
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
