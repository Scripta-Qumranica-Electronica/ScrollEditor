<template>
    <!-- `onResize` on a div never fired (only window fires resize) and was a string,
         not a handler; window resize is handled by the listener added in mounted(). -->
    <div id="app" :dir="$t('dir')">
        <navbar v-if="!waiting"></navbar>
        <div v-if="waiting">
            <Waiting></Waiting>
        </div>
        <div v-if="!waiting" class="container-fluid" id="main-container">
            <router-view></router-view>
        </div>
        <corrupted-state-dialog v-model="corruptedStateVisible" />
        <screen-size-alert :visible="alertVisible" />
    </div>

    <!-- TODO: Add footer -->
</template>

<script lang="ts">
import { Component, Prop, Emit, Vue, toNative } from 'vue-facing-decorator';

import Navbar from '@/components/navigation/Navbar.vue';
import Waiting from '@/components/misc/Waiting.vue';
import SessionService from '@/services/session';
import type { StateManager } from './state';
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

class App extends Vue {

    public waiting: boolean = true;
    public alertVisible: boolean = false;
    // TODO(vue3): CorruptedStateDialog needs to accept v-model for show/hide once it is migrated
    public corruptedStateVisible: boolean = false;

    public created() {
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

    public unmounted() {
        // Vue 3 renamed the `destroyed` lifecycle hook to `unmounted`; the old
        // name never fires, leaking these listeners.
        this.$state.eventBus.off(
            'corrupted-state',
            this.openCorruptedStateDialog
        );

        this.$nextTick( () =>
            window.removeEventListener('resize', this.showScreenSizeAlert)
        );
    }



    public showScreenSizeAlert(e: Event ) {
        e.preventDefault();

        const curOW = window.outerWidth;

        if ( curOW < 1000 ) {
            this.alertVisible = true;

            this.$nextTick( () => {
                this.alertVisible = true;
                // TODO(vue3): screen-size-alert uses :visible prop; modal visibility is driven by alertVisible
            });

        } else {
            this.alertVisible = false;

            this.$nextTick( () => {
                this.alertVisible = false;
                // TODO(vue3): screen-size-alert uses :visible prop; modal visibility is driven by alertVisible
            });
        }


   }
    public async initializeApp() {
        const session = new SessionService();
        await session.isTokenValid();
        this.waiting = false;
    }

    public openCorruptedStateDialog() {
        this.corruptedStateVisible = true;
    }

}

export default toNative(App);
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
