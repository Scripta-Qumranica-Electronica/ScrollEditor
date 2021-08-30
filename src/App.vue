<template>
    <div id="app" :dir="$t('dir')" onResize="showScreenSizeAlert($event)">
        <navbar v-if="!waiting"></navbar>
        <div v-if="waiting">
            <Waiting></Waiting>
        </div>
        <div v-if="!waiting" class="container-fluid" id="main-container">
            <router-view></router-view>
        </div>
        <corrupted-state-dialog />
        <screen-size-alert :visible="alertVisible" />
    </div>

    <!-- TODO: Add footer -->
</template>

<script lang="ts">

import { Component, Prop, Emit, Vue } from 'vue-property-decorator';

import Navbar from '@/components/navigation/Navbar.vue';
import Waiting from '@/components/misc/Waiting.vue';
import SessionService from '@/services/session';
import { StateManager } from './state';
import CorruptedStateDialog from '@/components/misc/CorruptedStateDialog.vue';

import ScreenSizeAlert from './views/home/components/screen-size-alert.vue';


@Component({
    name: 'app',
    components: {
        Navbar,
        Waiting,
        CorruptedStateDialog,
        'screen-size-alert': ScreenSizeAlert,
    }
})

export default class App extends Vue {

    private waiting: boolean = true;
    private alertVisible: boolean = false;

    private created() {
        // Set the language
        this.$i18n.locale = this.$state.session.language;
        this.initializeApp();
        // Corrupted state event listener
        this.$state.eventBus.on(
            'corrupted-state',
            this.openCorruptedStateDialog
        );


        this.$nextTick( () =>
            window.addEventListener('resize', this.showScreenSizeAlert)
        );
    }

    private destroyed() {
        this.$state.eventBus.off(
            'corrupted-state',
            this.openCorruptedStateDialog
        );

        this.$nextTick( () =>
            window.removeEventListener('resize', this.showScreenSizeAlert)
        );
    }



    private showScreenSizeAlert(e: Event ) {
        e.preventDefault();

        const curOW = window.outerWidth;

        if ( curOW < 785 ) {
            this.alertVisible = true;

            this.$nextTick( () => {
                this.alertVisible = true;
                this.$root.$bvModal.show('screen-size-alert');

            });

        } else {
            this.alertVisible = false;

            this.$nextTick( () => {
                this.alertVisible = false;
                this.$root.$bvModal.hide('screen-size-alert');
            });
        }


   }
    private async initializeApp() {
        const session = new SessionService();
        await session.isTokenValid();
        this.waiting = false;
    }

    private openCorruptedStateDialog() {
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

input.no-arrows::-webkit-outer-spin-button,
input.no-arrows::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

/* Firefox */
input.no-arrows[type=number] {
  -moz-appearance: textfield;
}
</style>
