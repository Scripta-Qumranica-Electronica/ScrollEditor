 <template>
  <div>
    <b-modal ref="loginModalRef" id="loginModal" title="Login" @shown="clearError">
        <b-container fluid>
            <b-row class="mb-2">
                <b-col cols="3">{{ $t('navbar.username') }}</b-col>
                <b-col><b-form-input v-model="username"></b-form-input></b-col>
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
            <b-button @click="login" variant="primary" type="submit" :disabled="incomplete">
                {{ $t('navbar.login') }}
            </b-button>
        </div>
    </b-modal>
  </div>
 </template>

<script lang="ts">
import Vue from 'vue';
import { mapState } from 'vuex';
import { localizedTexts } from '../i18n';
import SessionService from '../services/session';
import { ServerError } from '../services/communications';

export default Vue.extend({
    name: 'login',
    data() {
        return {
            username: this.$store.state.session.userName,
            password: '',
            errorMessage: '',
            sessionService: new SessionService(this.$store),
        };
    },
    computed: {
        incomplete(): boolean {
            return !this.username || !this.password;
        },
    },
    methods: {
        async login() {
            try {
                await this.sessionService.login(this.username, this.password);
                this.close();
            } catch (err) {
                const serverError = (err as ServerError);
                if (serverError) {
                    this.errorMessage = this.$t( `error.server${serverError.errorCode}`).toString();
                } else {
                    this.errorMessage = this.$t('error.server').toString();
                }
            }
        },
        close() {
            (this.$refs.loginModalRef as any).hide();
        },
        clearError() {
            this.errorMessage = '';
        }
    }
});
</script>
 