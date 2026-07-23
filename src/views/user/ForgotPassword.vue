<template>
    <div>
        <b-modal lazy
            v-model="modalVisible"
            id="passwordModal"
            header-class="title-header"
            footer-class="title-footer"
            @shown="shown"
        >
         <template v-slot:header>
                <b-row class="mt-3">
                    <b-col cols="12">Forgot Password</b-col>
                </b-row>
            </template>
            <b-container fluid @keyup.enter="submit">
                <b-row class="mb-2">
                    <b-col
                        ><b-form-input
                            v-model="email"
                            type="email"
                            ref="emailRef"
                            id="forgetPass"
                            placeholder="Email"
                        ></b-form-input
                    ></b-col>
                </b-row>

                <b-row>
                    <b-col class="text-danger">{{ errorMessage }}</b-col>
                </b-row>
            </b-container>
             <template v-slot:footer>
                <div class="w-100">
                    <b-button
                        @click="submit"
                        block
                        variant="primary"
                        class="btn-login-modal"
                       :disabled="disabledSubmit"
                    >
                        {{ $t('navbar.forgotPassword') }}
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

import SessionService from '@/services/session';
import ErrorService from '@/services/error';
import { registerModalListener } from '@/utils/modal-bus';

@Component({
    name: 'forgot-password',
})
class ForgotPassword extends Vue {

    // data

    public email: string = '';
    public errorMessage: string = '';
    public sessionService: SessionService = new SessionService();
    public errorService: ErrorService = new ErrorService(this);
    public waiting: boolean = false;
    public modalVisible: boolean = false;
    private disposeModalListener?: () => void;

    public mounted() {
        this.disposeModalListener = registerModalListener(
            'passwordModal',
            () => { this.modalVisible = true; },
            () => { this.modalVisible = false; },
        );
    }

    public beforeUnmount() {
        this.disposeModalListener?.();
    }

    // computed
    public get disabledSubmit(): boolean {
        return !this.email || this.waiting;
    }

    // methods

    public show() {
        this.modalVisible = true;
    }

    public async submit() {
        if (this.disabledSubmit) {
            // Can be called due to ENTER key
            return;
        }

        try {
            this.waiting = true;
            await this.sessionService.forgotPassword(this.email);
            this.close();

            // TODO(vue3): replace $toasted with vue-toastification or similar
            (this as any).$toasted.show(this.$t('toasts.reset'), {
                type: 'info',
                position: 'top-right',
                duration: 7000,
            });
        } catch (err) {
            this.errorMessage = this.errorService.getErrorMessage(
                (err as any).response.data
            );
        } finally {
            this.waiting = false;
        }
    }

    public close() {
        this.modalVisible = false;
    }

    public shown() {
        this.errorMessage = '';
        this.waiting = false;
        (this.$refs.emailRef as any).focus();
    }

}
export default toNative(ForgotPassword);
</script>

<style scoped>
</style>
