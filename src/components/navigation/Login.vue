 <template>
  <div>
    <b-modal ref="loginModalRef" id="loginModal" title="Login" @shown="shown">
        <b-container fluid @keyup.enter="login">
            <b-row class="mb-2">
                <b-col cols="3">{{ $t('navbar.email') }}</b-col>
                <b-col><b-form-input ref="email" v-model="email"  type="email"></b-form-input></b-col>
            </b-row>
            <b-row class="mb-2">
                <b-col cols="3">{{ $t('navbar.password') }}</b-col>
                <b-col>
                    <b-form-input v-model="password" type="password"></b-form-input>
                </b-col>
            </b-row>
            <b-row>
                <button @click="forgotPassword" class="btn btn-link">
                    {{ $t('navbar.forgotPassword') }}
                </button>
            </b-row>
            <b-row>
                <b-col class="text-danger">{{ errorMessage }}</b-col>
            </b-row>
        </b-container>

        <div slot="modal-footer">
            <b-button @click="close" class="mr-1">{{ $t('misc.cancel') }}</b-button>
            <b-button @click="login" variant="primary" type="submit" :disabled="disabledLogin">
                {{ $t('navbar.login') }}
                <span v-if="waiting">
                    <font-awesome-icon icon="spinner" spin></font-awesome-icon>
                </span>
            </b-button>
        </div>
    </b-modal>
    <forgot-password></forgot-password>
  </div>
 </template>

<script lang="ts">
import Vue from 'vue';
import { localizedTexts } from '@/i18n';
import SessionService from '@/services/session';
import ErrorService from '@/services/error';
import ForgotPassword from '@/views/user/ForgotPassword.vue';
import { StateManager } from '@/state';

export default Vue.extend({
    name: 'login',
    components: {
        ForgotPassword,
    },
    data() {
        return {
            email: '',
            // email: this.$state.session ? this.$state.session.user!.email : '',
            password: '',
            errorMessage: '',
            sessionService: new SessionService(),
            errorService: new ErrorService(this),
            waiting: false,
        };
    },
    computed: {
        disabledLogin(): boolean {
            return !this.email || !this.password || this.waiting;
        },
    },
    methods: {
        async login() {
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
                this.errorMessage = this.errorService.getErrorMessage(err.response.data);
            } finally {
                this.waiting = false;
            }
        },
        close() {
            (this.$refs.loginModalRef as any).hide();
        },
        shown() {
            this.errorMessage = '';
            this.waiting = false;
            (this.$refs.email as any).focus();
        },
        forgotPassword() {
            this.$root.$emit('bv::show::modal', 'passwordModal');
        }
    }
});
</script>

<style scoped>

</style>