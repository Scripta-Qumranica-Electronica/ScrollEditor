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
.title-header {
    font-family: $font-family;
    font-style: $font-style;
    font-weight: $font-weight-4;
    font-size: $font-size-4;
    line-height: 38px;
    letter-spacing: 0.28px;
    justify-content: center !important;
    border: unset !important;
}
.title-footer{
    border: unset !important;
    }
button.btn.btn-login-modal.btn-primary.btn-block {
    padding: 14px;
    background: $blue;
    border-radius: 3px;
    font-weight:$font-weight-2;
    font-style: $font-style;
    font-size: $font-size-1;
}
::placeholder {
    color: $dark-grey!important;
    font-size: $font-size-1;
}
.modal-content{
    border-radius:0px!important;
}
.sign-link{
    font-size: $font-size-1;
    font-weight:$font-weight-1;
    padding-top: 5px;

}
</style>