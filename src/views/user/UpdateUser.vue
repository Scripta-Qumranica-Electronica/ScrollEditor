<template>
    <div>
        <form>
            <b-row class="mb-3 no-gutters">
                <h4>{{ $t('navbar.updateUserDetails') }}</h4>
            </b-row>

            <b-row class="mb-3">
                <b-col cols="3">{{ $t('navbar.enterYourPassword') }}</b-col>
                <b-col class="col col-lg-4 col-md-3">
                    <b-form-input
                        v-model="password"
                        type="password"
                    ></b-form-input>
                </b-col>
            </b-row>

            <b-row class="mb-3">
                <b-col cols="3">{{ $t('navbar.forename') }}</b-col>
                <b-col class="col col-lg-4 col-md-3">
                    <b-form-input v-model="forename"></b-form-input>
                </b-col>
            </b-row>

            <b-row class="mb-3">
                <b-col cols="3">{{ $t('navbar.surname') }}</b-col>
                <b-col class="col col-lg-4 col-md-3">
                    <b-form-input v-model="surname"></b-form-input>
                </b-col>
            </b-row>

            <b-row class="mb-3">
                <b-col cols="3">{{ $t('navbar.email') }}</b-col>
                <b-col class="col col-lg-4 col-md-3">
                    <b-form-input v-model="email" type="email"></b-form-input>
                </b-col>
            </b-row>

            <b-row class="mb-3">
                <b-col cols="3">{{ $t('navbar.organization') }}</b-col>
                <b-col class="col col-lg-4 col-md-3">
                    <b-form-input v-model="organization"></b-form-input>
                </b-col>
            </b-row>

            <b-button
                @click="change"
                variant="primary"
                :disabled="disableChange"
            >
                {{ $t('navbar.update') }}
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
import { UserUpdateRequestDTO } from '@/dtos/sqe-dtos';
import router from '@/router';

@Component({
    name: 'update-user',
})
class UpdateUser extends Vue {
    // data
    public password: string = '';
    public surname: string | undefined = this.$state.session.user!.surname;
    public forename: string | undefined = this.$state.session.user!.forename;
    public email: string = this.$state.session.user!.email;
    public organization: string | undefined =
        this.$state.session.user!.organization;
    public errorMessage: string = '';
    public sessionService: SessionService = new SessionService();
    public errorService: ErrorService = new ErrorService(this);
    public waiting: boolean = false;

    // computed

    public get disableChange(): boolean {
        return (
            this.password === '' ||
            (this.surname === this.$state.session.user!.surname &&
                this.forename === this.$state.session.user!.forename &&
                this.email === this.$state.session.user!.email &&
                this.organization === this.$state.session.user!.organization)
        );
    }

    // methods

    public async change() {
        let emailChanged = false;
        if (this.email !== this.$state.session.user!.email) {
            emailChanged = true;
        }
        const data = {
            password: this.password,
            surname: this.surname,
            forename: this.forename,
            email: this.email,
            organization: this.organization,
        } as UserUpdateRequestDTO;

        this.waiting = true;

        try {
            const userInfo = await this.sessionService.updateUser(data);
            router.push('/');

            // TODO(vue3): replace $toasted with vue-toastification or similar
            (this as any).$toasted.show(this.$t('toasts.detailsChanged'), {
                type: 'info',
                position: 'top-right',
                duration: 7000,
            });
            if (emailChanged) {
                (this as any).$toasted.show(this.$t('toasts.activationLink'), {
                    type: 'info',
                    position: 'top-right',
                    duration: 7000,
                });
            }
            // todo: update details in $state, the name in the navbar have to update
            this.$state.session.user = userInfo;
        } catch (err) {
            this.errorMessage = this.errorService.getErrorMessage(
                (err as any).response.data
            );
        } finally {
            this.waiting = false;
        }
    }
}
export default toNative(UpdateUser);
</script>

<style  lang="scss" scoped>
@import '@/assets/styles/_classes.scss';
</style>
