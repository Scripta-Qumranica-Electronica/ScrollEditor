<template>
    <div>
        <form>
            <b-row class="mb-3 g-0">
                <h4>{{ $t('navbar.changePassword') }}</h4>
            </b-row>
            <b-row class="mb-3">
                <b-col cols="2">{{ $t('navbar.currentPassword') }}</b-col>
                <b-col  class="col col-lg-4 col-md-3">
                   <b-form-input
                        v-model="currentPassword"
                        type="password"
                    ></b-form-input
                ></b-col>
            </b-row>
            <b-row class="mb-3">
                <b-col cols="2">{{ $t('navbar.newPassword') }}</b-col>
                <b-col class="col col-lg-4 col-md-3"
                    ><b-form-input
                        v-model="newPassword"
                        type="password"
                    ></b-form-input
                ></b-col>
            </b-row>

            <b-row class="mb-3">
                <b-col cols="2">{{ $t('navbar.repassword') }}</b-col>
                <b-col class="col col-lg-4 col-md-3"
                    ><b-form-input
                        v-model="rePassword"
                        type="password"
                    ></b-form-input
                ></b-col>
            </b-row>

            <b-row>
                <b-col class="text-danger">{{ identicalError }}</b-col>
            </b-row>

            <b-button
                @click="change"
                variant="primary"
                :disabled="disableChange"
            >
                {{ $t('navbar.change') }}
                <span v-if="waiting">
                    <font-awesome-icon icon="spinner" spin></font-awesome-icon>
                </span>
            </b-button>

            <b-row>
                <b-col class="text-danger">{{ errorMessage }}</b-col>
            </b-row>
        </form>
    </div>
</template>

<script lang="ts">
import { Component, Vue, toNative } from 'vue-facing-decorator';

import SessionService from '@/services/session';
import ErrorService from '@/services/error';
import { ResetLoggedInUserPasswordRequestDTO } from '@/dtos/sqe-dtos';
import router from '@/router';

@Component({
    name: 'change-password',
})
class ChangePassword extends Vue {
    // data

    public currentPassword: string = '';
    public newPassword: string = '';
    public rePassword: string = '';
    public errorMessage: string = '';
    public sessionService: SessionService = new SessionService();
    public errorService: ErrorService = new ErrorService(this);
    public waiting: boolean = false;

    // computed
    public get disableChange(): boolean {
        return (
            this.newPassword !== this.rePassword ||
            !this.currentPassword ||
            !this.newPassword ||
            !this.rePassword ||
            this.waiting
        );
    }

    public get identicalError(): string {
        if (
            this.newPassword &&
            this.rePassword &&
            this.newPassword !== this.rePassword
        ) {
            return 'Passwords must be identical';
        }
        return '';
    }

    // methods
    public async change() {
        const data = {
            oldPassword: this.currentPassword,
            newPassword: this.newPassword,
        } as ResetLoggedInUserPasswordRequestDTO;
        this.waiting = true;

        try {
            await this.sessionService.changePassword(data);
            router.push('/');
            // TODO(vue3): replace $toasted with vue-toastification or similar
            (this as any).$toasted.show(this.$t('toasts.passwordChanged'), {
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
}
export default toNative(ChangePassword);
</script>

<style  lang="scss" scoped>
@import '@/assets/styles/_classes.scss';
</style>
