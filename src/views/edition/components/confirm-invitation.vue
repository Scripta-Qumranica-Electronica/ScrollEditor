<template>
    <div>
        <form>
            <b-row class="mb-3">
                <h4>{{ $t('navbar.confirmInvitation') }}</h4>
            </b-row>

            <b-row>
                <b-col cols="2">
                    <b-button @click="change" variant="primary" :disabled="!isLogged" class="btn-confirm">
                        {{ $t('navbar.accept') }}
                        <span v-if="waiting">
                            <font-awesome-icon icon="spinner" spin></font-awesome-icon>
                        </span>
                    </b-button>
                </b-col>
                <b-col cols="10">
                    <b-col class="text-danger" v-if="!isLogged">Please log in to accept invitation.</b-col>
                </b-col>
            </b-row>
            <b-row>
                <b-col class="text-danger">{{errorMessage}}</b-col>
            </b-row>
        </form>
    </div>
</template>

<script lang="ts">
import Vue from 'vue';
import ErrorService from '@/services/error';
import router from '@/router';
import {
    DetailedUserDTO
} from '@/dtos/sqe-dtos';
import EditionService from '@/services/edition';
import { UserInfo } from '@/models/edition';

export default Vue.extend({
    name: 'confirm-invitation',
    data() {
        return {
            token: '',
            errorMessage: '',
            editionService: new EditionService(),
            errorService: new ErrorService(this),
            waiting: false
        };
    },
    mounted() {
        if (!this.isLogged) {
            this.$root.$emit('bv::show::modal', 'loginModal');
        }

        const url = window.location.href;
        this.token = url.split('token/')[1];
        if (this.token === '') {
            console.error('There is no token in url');
        }
    },
    computed: {
        currentUser(): DetailedUserDTO {
            return this.$state.session.user!;
        },
        isLogged(): boolean {
            return this.currentUser !== null && this.currentUser !== undefined;
        }
    },

    methods: {
        async change() {
            this.waiting = true;
            try {
                await this.editionService.confirmAddEditionEditor(this.token);
                router.push('/');
            } catch (e) {
                this.errorMessage = this.errorService.getErrorMessage(
                    e.response.data
                );
            } finally {
                this.waiting = false;
            }
        }
    }
});
</script>

<style scoped>
form {
    margin: auto;
    margin-top: 20px;
    max-width: 1000px;
}
</style>
