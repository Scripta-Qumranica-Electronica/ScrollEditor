 <template>
    <div>
        <b-modal lazy
            v-model="visible"
            header-class="title-header"
            footer-class="title-footer"
            id="loginModal"
            @show="shown"
        >
            <template v-slot:header>
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
            <template v-slot:footer>
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
                     <p class="sign-link">Can't login? <b-link
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
import { Component, Vue, toNative } from 'vue-facing-decorator';

import SessionService from '@/services/session';
import ErrorService from '@/services/error';
import ForgotPassword from '@/views/user/ForgotPassword.vue';
import router from '@/router';
import { registerModalListener, showModal } from '@/utils/modal-bus';

@Component({
    name: 'login',
    components: {
        ForgotPassword,
    }
})
class Login extends Vue {

    public visible = false;
    public email: string = '';
    // email: this.$state.session ? this.$state.session.user!.email : '',
    public password: string = '';
    public errorMessage: string = '';
    public sessionService: SessionService = new SessionService();
    public errorService: ErrorService = new ErrorService(this);
    public waiting: boolean = false;
    private disposeModalListener?: () => void;

    public mounted() {
        // Bridge the legacy `$root.$emit('bv::show::modal', 'loginModal')` callers.
        this.disposeModalListener = registerModalListener(
            'loginModal',
            () => { this.visible = true; },
            () => { this.visible = false; },
        );
    }

    public beforeUnmount() {
        this.disposeModalListener?.();
    }

    public show() {
        this.visible = true;
    }

    public get disabledLogin(): boolean {
        return !this.email || !this.password || this.waiting;
    }

    public async login() {
        if (this.disabledLogin) {
            // Can be called due to ENTER key
            return;
        }

        try {
            this.waiting = true;
            await this.sessionService.login(this.email, this.password);
            this.visible = false;
            router.push('/home');
            // Reload the personal editions
            location.reload();
        } catch (err: any) {
            this.errorMessage = this.errorService.getErrorMessage(
                err.response.data
            );
        } finally {
            this.waiting = false;
        }
    }

    public shown(): void {
        this.errorMessage = '';
        this.waiting = false;
        // Focus the email input after the modal opens
        this.$nextTick(() => {
            (this.$refs.email as any)?.focus?.();
        });
    }

    public forgotPassword() {
        this.visible = false;
        showModal('passwordModal');
    }

    public register() {
        this.visible = false;
        showModal('registerModal');
    }

}
export default toNative(Login);
</script>


<style lang="scss" scoped>
@import '@/assets/styles/_variables.scss';
@import '@/assets/styles/_fonts.scss';
@import '@/assets/styles/_modals.scss';
</style>
