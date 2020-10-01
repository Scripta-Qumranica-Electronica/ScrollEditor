<template>
    <div class="welcome">
        <div class="welcome-wrapper">
            <p>{{ $t('home.home') }}</p>
            <p class="sub-title">
                The next generation of Dead Sea Scrolls research
            </p>
            <b-nav class="btn-login" align="center">
                <b-nav-item v-if="!userName">
                    <b-btn @click="login" size="sm">{{
                        $t('navbar.login')
                    }}</b-btn>
                </b-nav-item>
                <b-nav-item v-if="!userName">
                    <b-btn size="sm">
                        <router-link
                            :to="{ path: `/registration` }"
                            class="white-link"
                            >{{ $t('navbar.register') }}</router-link
                        >
                    </b-btn>
                </b-nav-item>
            </b-nav>
        </div>

        <login></login>
    </div>
</template>

<script lang="ts">
import { Component, Vue, Watch } from 'vue-property-decorator';
import Login from '../navigation/Login.vue';
import SessionService from '@/services/session';
import router from '@/router';
@Component({
    name: 'welcome',
    components: { login: Login },
})
export default class Welcome extends Vue {
    private sessionService = new SessionService();
    private login() {
        this.$root.$emit('bv::show::modal', 'loginModal');
    }
    private get userName(): string | undefined {
        if (this.$state.session.user) {
            return (
                this.$state.session.user.forename +
                ' ' +
                this.$state.session.user.surname
            );
        }
        return undefined;
    }
    private mounted() {
        if (this.userName) {
            router.push('/home');
        }
    }
    private logout() {
        this.sessionService.logout();
        router.push('/');
        location.reload();
    }
}
</script>

<style lang="scss" scoped>
.welcome {
    height: 480px;
    background-image: url('~@/assets/images/welcome.jpg');
    position: relative;

    .welcome-wrapper {
        position: relative;
        z-index: 20;
    }
    p {
        letter-spacing: 0em;
        text-transform: uppercase;
        color: #ffffff;
        text-align: center;
        font-size: 38px;
        font-style: italic;
        font-weight: 800;
        line-height: 49px;
        padding-top: 129px;
        margin: 0px;
        font-family: 'AvenirLTStd-Light';
    }
    .sub-title {
        font-style: normal;
        font-size: 20px;
        padding-top: 4.79px;
        padding-top: 4.79px;
        text-transform: inherit;
    }
}

.welcome:after {
    background: radial-gradient(
        61.25% 61.25% at 50% 100%,
        rgba(10, 20, 46, 0.35) 72.11%,
        rgba(10, 20, 46, 0) 100%
    );
    position: absolute;
    top: 0;
    width: 100%;
    height: 100%;
    content: '';
    left: 0;
    pointer-events: none;
    z-index: 10;
}
.btn-login {
    padding-top: 31px;
}
</style>
