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
import { StateManager } from '@/state';
import Registration from '@/views/user/Registration.vue';

@Component({
    name: 'login',
    components: {
        ForgotPassword,
    }
})

export default class Login extends Vue {


    // data

    protected email: string = '';
    // email: this.$state.session ? this.$state.session.user!.email : '',
    protected password: string = '';
    protected errorMessage: string = '';
    protected sessionService: SessionService = new SessionService();
    protected errorService: ErrorService = new ErrorService(this);
    protected waiting: boolean = false;

    // computed
    public get disabledLogin(): boolean {
        return !this.email || !this.password || this.waiting;
    }

    // methods

    protected async login() {
        if (this.disabledLogin) {
            // Can be called due to ENTER key
            return;
        }

        try {
            this.waiting = true;
            await this.sessionService.login(this.email, this.password);
            this.close();
            location.reload();
        } catch (err) {
            this.errorMessage = this.errorService.getErrorMessage(
                err.response.data
            );
        } finally {
            this.waiting = false;
        }
    }

    protected close() {
        (this.$refs.loginModalRef as any).hide();
    }

    protected shown(): void {
        this.errorMessage = '';
        this.waiting = false;
        (this.$refs.email! as any).focus();
    }

    protected forgotPassword() {
        this.$root.$emit('bv::show::modal', 'passwordModal');
    }

    protected register() {
        this.$root.$emit('bv::show::modal', 'registerModal');
    }

}

</script>


<style lang="scss">
@import '@/assets/styles/_variables.scss';
@import '@/assets/styles/_fonts.scss';
.title-header {
    font-family: $font-family;
    font-style: $font-style;
    font-weight: $font-weight-4;
    font-size: $font-size-4;
    line-height: 38px;
    letter-spacing: 0.28px;
    justify-content: center !important;
    border: unset !important;
}
.title-footer{
    border: unset !important;
    }
button.btn.btn-login-modal.btn-primary.btn-block {
    padding: 14px;
    background: $blue;
    border-radius: 3px;
    font-weight:$font-weight-2;
    font-style: $font-style;
    font-size: $font-size-1;
}
::placeholder {
    color: $dark-grey!important;
    font-size: $font-size-1;
}
.modal-content{
    border-radius:0px!important;
}
.sign-link{
    font-size: $font-size-1;
    font-weight:$font-weight-1;
    padding-top: 5px;

}
</style>