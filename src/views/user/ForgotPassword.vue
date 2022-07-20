 <template>
    <div>
        <b-modal
            ref="passwordModalRef"
            id="passwordModal"
            header-class="title-header"
            footer-class="title-footer"
            @shown="shown"
        >
         <template v-slot:modal-header>
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
             <template v-slot:modal-footer>
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
import { Component, Prop, Emit, Vue } from 'vue-property-decorator';

import SessionService from '@/services/session';
import ErrorService from '@/services/error';
// import ForgotPassword from '@/views/user/ForgotPassword.vue';

@Component({
    name: 'forgot-password',
})

export default class ForgotPassword extends Vue {

    // data

    protected email: string = '';
    protected errorMessage: string = '';
    protected sessionService: SessionService = new SessionService();
    protected errorService: ErrorService = new ErrorService(this);
    protected waiting: boolean = false;


    // computed
    public get disabledSubmit(): boolean {
        return !this.email || this.waiting;
    }

    // methods

    protected async submit() {
        if (this.disabledSubmit) {
            // Can be called due to ENTER key
            return;
        }

        try {
            this.waiting = true;
            await this.sessionService.forgotPassword(this.email);
            this.close();

            this.$toasted.show(this.$tc('toasts.reset'), {
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
    }

    protected close() {
        (this.$refs.passwordModalRef as any).hide();
    }

    protected shown() {
        this.errorMessage = '';
        this.waiting = false;
        (this.$refs.emailRef as any).focus();
    }

}

</script>

<style scoped>
</style>