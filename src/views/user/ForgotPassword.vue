 <template>
  <div>
    <b-modal ref="passwordModalRef" id="passwordModal" title="Forgot Password" @shown="shown">
        <b-container fluid @keyup.enter="submit">
            <b-row class="mb-2">
                <b-col cols="3">{{ $t('navbar.email') }}</b-col>
                <b-col><b-form-input v-model="email" type="email" ref="emailRef" id="forgetPass"></b-form-input></b-col>
            </b-row>

            <b-row>
                <b-col class="text-danger">{{errorMessage}}</b-col>
            </b-row> 
        </b-container>

        <div slot="modal-footer">
            <b-button @click="close" class="mr-1">{{ $t('misc.cancel') }}</b-button>
            <b-button @click="submit" variant="primary" type="submit"  class="forgetPass"  :disabled="disabledSubmit">
                {{ $t('navbar.forgotPassword') }}
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
import { localizedTexts } from '@/i18n';
import SessionService from '@/services/session';
import ErrorService from '@/services/error';

export default Vue.extend({
    name: 'forgot-password',
    data() {
        return {
            email: '',
            errorMessage: '',
            sessionService: new SessionService(),
            errorService: new ErrorService(this),
            waiting: false,
        };
    },
    computed: {
        disabledSubmit(): boolean {
            return !this.email || this.waiting;
        },
    },
    methods: {
        submit() {
            if (this.disabledSubmit) {
                // Can be called due to ENTER key
                return;
            }

            try {
                this.waiting = true;
                this.sessionService.forgotPassword(this.email);
                this.close();

                this.$toasted.show(this.$tc('toasts.reset'), {
                    type: 'info',
                    position: 'top-right',
                    duration: 7000
                });
            } catch (err) {
                this.errorMessage = this.errorService.getErrorMessage(err.response.data);
            } finally {
                this.waiting = false;
            }
        },
        close() {
            (this.$refs.passwordModalRef as any).hide();
        },
        shown() {
            this.errorMessage = '';
            this.waiting = false;
            (this.$refs.emailRef as any).focus();
        }
    }
});
</script>

<style scoped>

</style>