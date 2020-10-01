<template>
    <div style="height: 100vh" class="overflow-auto">
        <div class="welcome">
            <div class="welcome-wrapper">
                <p class="title">{{ $t('home.home') }}</p>
                <p class="sub-title">
                    The next generation of Dead Sea Scrolls research
                </p>
                <b-nav class="btn-login" align="center">
                    <b-nav-item v-if="!userName">
                        <b-btn  size="md"  @click="login" style="background:#FFFFFF;color:#145AF3;width:120px">{{
                            $t('navbar.login')
                        }}</b-btn>
                    </b-nav-item>
                    <b-nav-item v-if="!userName">
                        <b-btn  size="md" @click="register" variant="primary" style="width:120px">
                            {{ $t('navbar.register') }}
                        </b-btn>
                    </b-nav-item>
                </b-nav>
                   <p class="link">Enter the scrollery as a guest</p>
            </div>

            <login></login>
            <register></register>
        </div>
        <div class="intro">
            <div class="row">
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
                      <div class="col-4 border-right font"><b-link>Learn more About the project</b-link></div>
                       <div class="col-4 border-right font"><b-link>Dead sea scrolls website</b-link></div>  
                        <div class="col-4 border-right font"><b-link>Dead sea scrolls website</b-link></div>    
                    </div>
                </div>
                <div class="col-6 align-self-center">
                    <div class="container">
                        <div class="row logos">
                            <div class="col p-3">
                                <img src="@/assets/images/logo_antiquity.png" />
                            </div>
                            <div class="col p-3">
                                <img src="@/assets/images/logo_gottingen.png" />
                            </div>
                            <div class="w-100"></div>
                            <div class="col p-3">
                                <img src="@/assets/images/logo_tlv.png" />
                            </div>
                            <div class="col p-3">
                                <img src="@/assets/images/logo_jlm.png" />
                            </div>
                            <div class="col p-3">
                                <img src="@/assets/images/logo_haifa.png" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
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
    components: { Login, register: Registration },
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
    height: 400px;
    position: relative;
    background-image: url('~@/assets/images/welcome.jpg');
    background-position: bottom left;
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
    .link{
        font-family: 'AvenirLTStd-Light';
        font-size: 16px;
         font-weight: 800;
        text-align: center;
        text-decoration: underline;
        text-transform: inherit;
        padding-top: 20px;
        font-style:normal;
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
.btn-login {
    padding-top: 31px;
}
.logos {
    .col {
        text-align: center;
    }
    img {
        max-width: 200px;
    }
}
.font{
    font-size: 14px;
    font-weight: 500;
    text-decoration: underline;
    text-align: center;
}

</style>
