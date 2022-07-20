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
import { Component, Prop, Emit, Vue } from 'vue-property-decorator';

import SessionService from '@/services/session';
import ErrorService from '@/services/error';
import { UserUpdateRequestDTO } from '@/dtos/sqe-dtos';
import router from '@/router';

@Component({
    name: 'update-user',
})
export default class UpdateUser extends Vue {
    // data
    protected password: string = '';
    protected surname: string | undefined = this.$state.session.user!.surname;
    protected forename: string | undefined = this.$state.session.user!.forename;
    protected email: string = this.$state.session.user!.email;
    protected organization: string | undefined =
        this.$state.session.user!.organization;
    protected errorMessage: string = '';
    protected sessionService: SessionService = new SessionService();
    protected errorService: ErrorService = new ErrorService(this);
    protected waiting: boolean = false;

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

    protected async change() {
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

            this.$toasted.show(this.$tc('toasts.detailsChanged'), {
                type: 'info',
                position: 'top-right',
                duration: 7000,
            });
            if (emailChanged) {
                this.$toasted.show(this.$tc('toasts.activationLink'), {
                    type: 'info',
                    position: 'top-right',
                    duration: 7000,
                });
            }
            // todo: update details in $state, the name in the navbar have to update
            this.$state.session.user = userInfo;
        } catch (err) {
            this.errorMessage = this.errorService.getErrorMessage(
                err.response.data
            );
        } finally {
            this.waiting = false;
        }
    }
}
</script>

<style  lang="scss" scoped>
@import '@/assets/styles/_classes.scss';
</style>
