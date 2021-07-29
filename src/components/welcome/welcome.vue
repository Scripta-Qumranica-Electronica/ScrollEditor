<template>
    <div class="overflow-auto welcome-container">
        <div class="welcome">
            <div class="welcome-wrapper">
                <p class="title">{{ $t('home.home') }}</p>
                <p class="sub-title">
                    The next generation of Dead Sea Scrolls research
                </p>
                <b-nav class="btn-inscription" align="center">
                    <b-nav-item v-if="!userName">
                        <b-btn size="md" @click="login" class="btn-login">
                            {{ $t('navbar.login') }}</b-btn
                        >
                    </b-nav-item>
                    <b-nav-item v-if="!userName">
                        <b-btn
                            size="md"
                            @click="register"
                            variant="primary"
                            class="btn-regis"
                        >
                            {{ $t('navbar.register') }}
                        </b-btn>
                    </b-nav-item>
                </b-nav>
                <p class="link">
                    <router-link :to="{ path: `/home` }" v-if="!userName">
                        Enter the scrollery as a guest
                    </router-link>
                    <router-link :to="{ path: `/home` }" v-if="userName">
                        Start Working
                    </router-link>
                </p>
            </div>

            <register></register>
        </div>
        <div class="intro">
            <section class="row">
                <div class="col-6 border-right">
                    <h5>OUR STORY</h5>
                    <p class="description">
                        The Scripta Qumranica Electronica (SQE) is a
                        German-Israeli cooperation financed through the
                        German-Israeli Project (DIP) of the German Research
                        Foundation (DFG).
                    </p>
                    <p class="description">
                        It links together the Leon Levy Dead Sea Scrolls Digital
                        Library of the IAA and the Qumran-Lexicon-project of the
                        Gottingen Academy of Sciences and Humanities, together
                        with computer aided tools developed by the Tel-Aviv
                        University. The platform enables scholars around the
                        world to work together simultaneousy.
                    </p>
                    <div class="row">
                        <div class="col-4 border-right font">
                            <b-link href="https://qumranica.org" target="_blank">Learn more About the project</b-link>
                        </div>
                        <div class="col-6 border-right font">
                            <b-link href="https://www.deadseascrolls.org.il/home" target="_blank">
                                The Leon Levy Dead Sea Scrolls Digital Library
                            </b-link>
                        </div>

                    </div>
                </div>
                <div class="col-6 align-self-center">
                    <div class="container">
                        <div class="row logos">
                            <div class="col p-3 right">
                                <b-link
                                    href="http://www.antiquities.org.il/default_en.aspx" target="_blank">
                                    <img
                                        src="@/assets/images/logo_antiquity.png"
                                        alt="Israel Antiquities Authority logo"
                                    />
                                </b-link>
                           </div>
                            <div class="col p-3">
                                <b-link href="https://www.uni-goettingen.de/" target="_blank">
                                    <img
                                        src="@/assets/images/logo_gottingen.png"
                                        alt="University of Göttingen logo"
                                    />
                                </b-link>
                            </div>
                            <div class="col p-3">
                                <b-link href="https://adw-goe.de/startseite/" target="_blank">
                                    <img
                                        src="@/assets/images/logo_adwg.svg"
                                        alt="Akademie der Wissenschaften zu Göttingen"
                                    />
                                </b-link>
                            </div>
                        </div>
                        <div class="row logos">
                            <div class="col p-3 right">
                                <b-link href="https://english.tau.ac.il/" target="_blank">
                                    <img
                                        src="@/assets/images/logo_tlv.png"
                                        alt="University of TLV logo"
                                    />
                                </b-link>
                            </div>
                            <div class="col p-3">
                                <b-link href="https://gepris.dfg.de/gepris/projekt/282601852?language=en" target="_blank">
                                    <img
                                        src="@/assets/images/logo_dfg.svg"
                                        alt="DFG Project Details"
                                    />
                                </b-link>
                            </div>
                            <div class="col p-3">
                                <b-link href="https://www.haifa.ac.il/" target="_blank">
                                    <img
                                        src="@/assets/images/logo_haifa.png"
                                        alt="University of Haifa logo"
                                    />
                                </b-link>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    </div>
</template>

<script lang="ts">
import { Component, Vue, Watch } from 'vue-property-decorator';
import Login from '../navigation/Login.vue';
import Registration from '@/views/user/Registration.vue';
import SessionService from '@/services/session';
import router from '@/router';
@Component({
    name: 'welcome',
    components: { register: Registration },
})
export default class Welcome extends Vue {
    private sessionService = new SessionService();
    private login() {
        this.$root.$emit('bv::show::modal', 'loginModal');
    }
    private register() {
        this.$root.$emit('bv::show::modal', 'registerModal');
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

    private startWorking() {
        router.push('/home');
    }

    private logout() {
        this.sessionService.logout();
        router.push('/');
        location.reload();
    }
}
</script>

<style lang="scss" scoped>
@import '@/assets/styles/_variables.scss';
@import '@/assets/styles/_fonts.scss';
.welcome-container{
    height: 100vh;
}
.welcome {
    height: 400px;
    position: relative;
    background-image: url('~@/assets/images/welcome.jpg');
    background-position: bottom left;
    .welcome-wrapper {
        position: relative;
        z-index: 20;
    }
    p, p.title {
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
        font-family: $font-family;
    }
    .sub-title {
        font-style: $font-style;
        font-size: 20px;
        padding-top: 4.79px;
        padding-top: 4.79px;
        text-transform: inherit;
    }
    .link {
        font-family: $font-family;
        font-size: 16px;
        font-weight: 800;
        text-align: center;
        text-decoration: underline;
        text-transform: inherit;
        padding-top: 20px;
        font-style: normal;
    }
    .link a {
        color: white;
    }
}

.intro {
    padding: 4%;
}

.welcome:after {
    background: radial-gradient(
        55% 75% at 50% 100%,
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
.btn-inscription {
    padding-top: 31px;
}
.logos {
    .col {
        text-align: left;
        &.right {
            text-align: right;
        }
    }
    img {
        max-height: 70px;
        padding: 10px;
        filter: grayscale(100%);
    }
}
.font {
    font-size: $font-size-1;
    font-weight: $font-weight-1;
    text-decoration: underline;
    text-align: center;
}
.btn-regis,
.btn-login {
    width: 120px;
}
.btn-login {
    background: #ffffff;
    color: $blue;
}
.btn-login:active,
.btn-login:focus,
.btn-login:hover,
.btn-login.disabled
 {
    color: #145af3!important;
    background-color:white!important;
    border-color:white!important;
}
</style>
