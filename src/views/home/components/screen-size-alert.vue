<template>
            <!-- :width="600" :height="600" -->
        <b-modal
            ref="ScreenSizeAlertRef"
            id="ScreenSizeAlertModal"
            header-class="title-header"
            footer-class="title-footer"
            aria-role="dialog"
            aria-label="Screen Size Alert Modal"
            header-bg-variant="dark"
            header-text-variant="light"
            bg-variant="dark"
            text-variant="light"
            size="lg"
            :width="2000" :height="2000"
            ok-only

            :destroy-on-hide="false"
            :clickToClose="false"
            :no-close-on-backdrop="true"
            :visible="visible"

        >
            <!-- These lines prevent modal closing by background click -->
            <!--
            :destroy-on-hide="false"
            :clickToClose="false"
            :no-close-on-backdrop="true"
            -->

            <!--
                :ok-disabled="true"
            -->

            <template v-slot:modal-header>
                <div w-100 m-3 p-3>
                    <h1 text-center><b>This screen size is not supported yet. </b></h1>
                </div>
            </template>


            <div w-100 m-3 p-3>
                <span>Please switch to your desktop or laptop or resize your screen. </span>
            </div>


        </b-modal>


</template>


<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';

@Component({
    name: 'ScreenSizeAlert',
    components: {
    }
})

export default class AboutModal extends Vue {

     @Prop({default: false}) private visible!: boolean ;

}

</script>
<style lang="scss" scoped>
@import '@/assets/styles/_variables.scss';
@import '@/assets/styles/_fonts.scss';
@import '@/assets/styles/_modals.scss';
</style>