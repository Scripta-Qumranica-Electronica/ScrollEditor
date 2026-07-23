<template>
    <div>
        <b-modal lazy
            header-class="title-header"
            footer-class="title-footer"
            v-model="modalVisible"
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
                        <b-form-checkbox v-model="termsOfUse">I have read and accept the <b-link href="#"  @click="showTermsOfUse">Terms of Use</b-link>.</b-form-checkbox>
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
import { Component, Vue, toNative } from 'vue-facing-decorator';
import { showModal, registerModalListener } from '@/utils/modal-bus';

import SessionService from '@/services/session';
import ErrorService from '@/services/error';
import { NewUserRequestDTO } from '@/dtos/sqe-dtos';

@Component({
    name: 'registration',
})
class Registration extends Vue {

    // data

    public forename: string = '';
    public surname: string = '';
    public email: string = '';
    public password: string = '';
    public repassword: string = '';
    public organization: string = '';
    public errorMessage: string = '';
    public sessionService: SessionService = new SessionService();
    public errorService: ErrorService = new ErrorService(this);
    public waiting: boolean = false;
    public termsOfUse: boolean = false;
    public modalVisible: boolean = false;
    private disposeModalListener?: () => void;

    public mounted() {
        this.disposeModalListener = registerModalListener(
            'registerModal',
            () => { this.modalVisible = true; },
            () => { this.modalVisible = false; },
        );
    }

    public beforeUnmount() {
        this.disposeModalListener?.();
    }


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

    public show() {
        this.modalVisible = true;
    }

    public showTermsOfUse() {
        showModal('EulaModal');
    }

    // methods
    public async register() {
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

            // TODO(vue3): replace $toasted with vue-toastification or similar
            (this as any).$toasted.show(this.$t('toasts.activationLink'), {
                type: 'info',
                position: 'top-right',
                duration: 9000, // was 7000
            });
        } catch (err) {
            this.errorMessage = this.errorService.getErrorMessage(
                (err as any).response.data
            );
        } finally {
            this.waiting = false;

            // Close modal window,
            // But the login will be done from the activation page.
            this.modalVisible = false;
        }
    }

}
export default toNative(Registration);
</script>

<style scoped>
form {
    margin: auto;
    margin-top: 20px;
    max-width: 1000px;
}
</style>
