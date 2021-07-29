<template>
    <div>
        <b-modal
            header-class="title-header"
            footer-class="title-footer"
            ref="CitationModalRef"
            id="CitationModal"
            aria-role="dialog"
            aria-label="Citation Modal"
            size="lg" scroll="keep"
            ok-only
            trap-focus
            :destroy-on-hide="true"
            @shown="shown"
        >
            <template v-slot:modal-header>
                <b-row>
                    <b-col cols="12"> <b>{{ `${$t('home.home')} - Citation` }} </b> </b-col>
                </b-row>

            </template>

            <b-container fluid>
                <p>The images are licensed under a Creative Commons Attribution-Non Commercial 4.0 International (CC BY-NC 4.0).
https://creativecommons.org/licenses/by-nc/4.0/
<break/>

You are permitted to use images for non-commercial uses such as lectures, public presentations and other educational uses.  To license images for commercial uses such as reproduction, publications, displays, etc., please contact the Israel Antiquities Authority Visual Archive at VisualArchive@israntique.org.il.  

<break/>
For more information on licensing please contact us at contact@deadseascrolls.org.il</p>
                <p>
                    Text © Reinhard G. Kratz \n\nProvided by Reinhard G. Kratz, Ingo Kottsieper, and Annette Steudel on the basis of a text provided by the Qumran-Wörterbuch of the Göttingen Academy of Sciences, \nwhich is based upon a preliminary text provided by Martin Abegg.\n\nThis work is licensed under the Creative Commons Attribution-ShareAlike 4.0 International License. \nTo view a copy of this license, visit https://creativecommons.org/licenses/by-sa/4.0/legalcode \nor send a letter to Creative Commons, PO Box 1866, Mountain View, CA 94042, USA.
                </p>
            </b-container>

        </b-modal>

    </div>
</template>


<script lang="ts">
import { Component, Prop, Emit, Vue } from 'vue-property-decorator';

@Component({
    name: 'Citation',
    components: {
    }
})

export default class CitationModal extends Vue {
    private shown(): void {
        console.log('Citation Modal');

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
h2 {
    color: $blue;
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