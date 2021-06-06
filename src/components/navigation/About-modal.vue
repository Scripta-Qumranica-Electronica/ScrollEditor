<template>
    <div>
        <b-modal
            header-class="title-header"
            footer-class="title-footer"
            ref="AboutModalRef"
            id="AboutModal"
            aria-role="dialog"
            aria-label="About Modal"
            :width="640" scroll="keep"
            ok-only
            trap-focus
            :destroy-on-hide="true"
            @shown="shown"
        >
            <template v-slot:modal-header>
                <b-row>
                    <b-col cols="12"> <b>{{ $t('home.home') }} </b> </b-col>
                </b-row>

            </template>

            <b-container fluid>
            </b-container>

        </b-modal>

    </div>
</template>


<script lang="ts">
import { Component, Prop, Emit, Vue } from 'vue-property-decorator';

@Component({
    name: 'About',
    components: {
    }
})

export default class AboutModal extends Vue {
    private shown(): void {
        console.log('About Modal');

    }

}

</script>
<style lang="scss">
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