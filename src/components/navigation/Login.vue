 <template>
  <div>
    <b-modal ref="loginModalRef" id="loginModal" title="Login" @shown="shown">
        <b-container fluid @keyup.enter="login">
            <b-row class="mb-2">
                <b-col cols="3">{{ $t('navbar.username') }}</b-col>
                <b-col><b-form-input ref="username" v-model="username"></b-form-input></b-col>
            </b-row>
            <b-row class="mb-2">
                <b-col cols="3">{{ $t('navbar.password') }}</b-col>
                <b-col>
                    <b-form-input v-model="password" type="password"></b-form-input>
                </b-col>
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
  </div>
 </template>

<script lang="ts">
import Vue from 'vue';
import { mapState } from 'vuex';
import { localizedTexts } from '@/i18n';
import SessionService from '@/services/session';
import { ServerError } from '@/services/communications';

export default Vue.extend({
    name: 'login',
    data() {
        return {
            username: this.$store.state.session.userName,
            password: '',
            errorMessage: '',
            sessionService: new SessionService(this.$store),
            waiting: false,
        };
    },
    computed: {
        disabledLogin(): boolean {
            return !this.username || !this.password || this.waiting;
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
                await this.sessionService.login(this.username, this.password);
                this.close();
                location.reload();
            } catch (err) {
                const serverError = (err as ServerError);
                if (serverError) {
                    this.errorMessage = this.$t( `error.server${serverError.errorCode}`).toString();
                } else {
                    this.errorMessage = this.$t('error.server').toString();
                }
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
            (this.$refs.username as any).focus();
        }
    }
});
</script>
 