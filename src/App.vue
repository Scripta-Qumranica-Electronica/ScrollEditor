<template>
    <div id="app" :dir="$t('dir')">
        <navbar v-if="!waiting"></navbar>
        <div v-if="waiting">
            <Waiting></Waiting>
        </div>
        <div v-if="!waiting" class="container-fluid" id="main-container">
            <router-view></router-view>
        </div>
        <corrupted-state-dialog />
    </div>

    <!-- TODO: Add footer -->
</template>

<script lang="ts">

import { Component, Prop, Emit, Vue } from 'vue-property-decorator';

import Navbar from '@/components/navigation/Navbar.vue';
import Waiting from '@/components/misc/Waiting.vue';
import SessionService from '@/services/session.ts';
import { StateManager } from './state';
import CorruptedStateDialog from '@/components/misc/CorruptedStateDialog.vue';


@Component({
    name: 'app',
    components: {
        Navbar,
        Waiting,
        CorruptedStateDialog
    }
})

export default class App extends Vue {

    // data

    protected waiting: boolean = true;


    public created() {
        // Set the language
        this.$i18n.locale = this.$state.session.language;
        this.initializeApp();
        // Corrupted state event listener
        this.$state.eventBus.on(
            'corrupted-state',
            this.openCorruptedStateDialog
        );
    }

    public destroyed() {
        this.$state.eventBus.off(
            'corrupted-state',
            this.openCorruptedStateDialog
        );
    }

    public async initializeApp() {
        const session = new SessionService();
        await session.isTokenValid();
        this.waiting = false;
    }

    public openCorruptedStateDialog() {
            this.$root.$emit('bv::show::modal', 'corrupted-state-dialog');
    }

}

</script>

<style lang="scss">
@import '@/assets/styles/_variables.scss';
@import '@/assets/styles/_fonts.scss';
@font-face {
    font-family: 'SBL Hebrew';
    src: url('./assets/fonts/SBL_Hbrw.woff') format('woff');
    font-weight: normal;
    font-style: normal;
}

@font-face {
    font-family: 'AvenirLTStd-Light';
    src: url('./assets/fonts/AvenirLTStd-Light.woff') format('woff');
    font-weight: normal;
    font-style: normal;
}

@font-face {
  font-family: "scroll_hebrew";
  src: url('./assets/fonts/scroll_hebrew.woff') format('woff');
  font-weight: normal;
  font-style: normal;
}

body {
    overflow: hidden;
    background-color: $backround-grey !important; /* Override bootstrap */
}

#main-container {
    max-height: calc(100vh - 56px); /* Navbar is 56 pixels high */
    padding: 0px;
    background-color: #e5e5e5;
}
</style>
