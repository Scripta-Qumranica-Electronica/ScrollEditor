 <template>
    <div>
        <b-modal
            header-class="title-header"
            footer-class="title-footer"
            ref="loginModalRef"
            id="loginModal"
            @shown="shown"
        >
            <template v-slot:modal-header>
                <b-row>
                    <b-col cols="12">Log in to your account</b-col>
                </b-row>
            </template>
            <b-container fluid @keyup.enter="login">
                <b-row class="mb-2">
                    <b-col
                        ><b-form-input
                            ref="email"
                            v-model="email"
                            type="email"
                            placeholder="Username or email"
                        ></b-form-input
                    ></b-col>
                </b-row>
                <b-row class="mb-2">
                    <b-col>
                        <b-form-input
                            v-model="password"
                            type="password"
                            placeholder="Password"
                        ></b-form-input>
                    </b-col>
                </b-row>
                <b-row class="justify-content-end">
                    <b-link @click="forgotPassword" class="sign-link">
                        {{ $t('navbar.forgotPassword') }}?
                    </b-link>
                </b-row>
                <b-row>
                    <b-col class="text-danger">{{ errorMessage }}</b-col>
                </b-row>
            </b-container>
            <template v-slot:modal-footer>
                <div class="w-100">
                    <b-button
                        @click="login"
                        block
                        variant="primary"
                        class="btn-login-modal"
                        :disabled="disabledLogin"
                    >
                        {{ $t('navbar.login') }}
                        <span v-if="waiting">
                            <font-awesome-icon
                                icon="spinner"
                                spin
                            ></font-awesome-icon>
                        </span>
                    </b-button>
                     <p class="sign-link">Can’t login? <b-link
                        @click="register"
                        >Sign up</b-link
                    > for an account here</p>
                </div>

            </template>

        </b-modal>
        <forgot-password></forgot-password>
    </div>
</template>

<script lang="ts">
import { Component, Prop, Emit, Vue } from 'vue-property-decorator';

import SessionService from '@/services/session';
import ErrorService from '@/services/error';
import ForgotPassword from '@/views/user/ForgotPassword.vue';
import router from '@/router';

@Component({
    name: 'login',
    components: {
        ForgotPassword,
    }
})

export default class Login extends Vue {

    private email: string = '';
    // email: this.$state.session ? this.$state.session.user!.email : '',
    private password: string = '';
    private errorMessage: string = '';
    private sessionService: SessionService = new SessionService();
    private errorService: ErrorService = new ErrorService(this);
    private waiting: boolean = false;


    private get disabledLogin(): boolean {
        return !this.email || !this.password || this.waiting;
    }

    private async login() {
        if (this.disabledLogin) {
            // Can be called due to ENTER key
            return;
        }

        try {
            this.waiting = true;
            await this.sessionService.login(this.email, this.password);
            this.close();
            router.push('/home');
        } catch (err) {
            this.errorMessage = this.errorService.getErrorMessage(
                err.response.data
            );
        } finally {
            this.waiting = false;
        }
    }

    private close() {
        (this.$refs.loginModalRef as any).hide();
    }

    private shown(): void {
        this.errorMessage = '';
        this.waiting = false;
        (this.$refs.email! as any).focus();
    }

    private forgotPassword() {
        this.$root.$emit('bv::show::modal', 'passwordModal');
        this.$bvModal.hide('loginModal');
    }

    private register() {
        this.$root.$emit('bv::show::modal', 'registerModal');
        this.$bvModal.hide('loginModal');
    }

}

</script>


<style lang="scss" scoped>
@import '@/assets/styles/_variables.scss';
@import '@/assets/styles/_fonts.scss';
@import '@/assets/styles/_modals.scss';
</style>