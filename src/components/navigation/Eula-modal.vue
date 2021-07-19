<template>
    <div>
        <b-modal
            header-class="title-header"
            footer-class="title-footer"
            ref="EulaModalRef"
            id="EulaModal"
            aria-role="dialog"
            aria-label="EULA Modal"
            :width="640" scroll="keep"
            ok-only
            trap-focus
            :destroy-on-hide="true"
            @shown="shown"
        >
            <template v-slot:modal-header>
                <b-row>
                    <b-col cols="12"> <b>{{ $t('home.home') }} - {{$t('navbar.eula')}} </b> </b-col>
                </b-row>

            </template>

            <b-container fluid>
                <h1>Terms of Use</h1>
<p>By accessing the Scripta Qumranica Electronica Platform, I hereby declare and agree to the following terms of use as agreed upon by the participating institutions (Göttingen Academy of Sciences and Humanities; Israel Antiquities Authority; Tel Aviv University; University of Göttingen):</p>
<ol>
    <li>I understand that the following personal data will be collected by the API: name, email and organizational affiliation. This information will not be shared with other third parties.</li>
    <li>I confirm that the information that I submitted is correct and will be used for copyright purposes on the platform.</li>
    <li>I understand that I may be denied access to the site if I am found in breach of any of the clauses mentioned in these “Terms of Use.”</li>
    <li>I understand that despite the efforts made to ensure that the images, text and the accompanying metadata are correct, precise and comprehensive, some errors or omissions may have occurred, and I will not hold any of the participating institutions or personnel liable for these errors or omissions or for any ensuing damage of any kind.</li>
    <li>I confirm that any use of the data on the site will be according to the copyright and license information accompanying the source. I will respect the license accompanying the data and will not use it in a way which is not in concord with the given license.</li>
    <li>I understand that all scholarly data that I input will be automatically shared within the system once the "Publish" button is pressed. This data will be copyrighted to the name provided by me when I registered and automatically licensed by Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0) terms. For details: <a target="_blank" href="https://creativecommons.org/licenses/by-sa/4.0/">https://creativecommons.org/licenses/by-sa/4.0/</a>.</li>
    <li>I agree that after I publish material on this platform, my name and email address will be disclosed on this platform.</li>
    <li>I agree that by publishing my data or work on this platform, I agree that others will use my data and work for free in their studies or publications, in conjunction with the copyright terms of use in the Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0) terms. For details: <a target="_blank" href="https://creativecommons.org/licenses/by-sa/4.0/">https://creativecommons.org/licenses/by-sa/4.0/</a>.</li>
    <li>All digital images that are provided by the Israel Antiquities Authority are available for use under a Creative Commons Attribution-Non Commercial 4.0 International (CC BY-NC 4.0) terms. For details: <a target="_blank" href="https://creativecommons.org/licenses/by-nc/4.0/">https://creativecommons.org/licenses/by-nc/4.0/</a>. Use of these images for non-commercial uses such as lectures, public presentations and other educational uses is permitted, with the proper credit as noted in the images and according to the terms of use. For other uses, please contact the IAA visual archive at <a href="mailto:visualarchive@israntique.org.il">visualarchive@israntique.org.il</a>.</li>
    <li>Textual reconstructions are the property of the Göttingen Academy of Sciences and Humanities unless otherwise stated. All textual reconstructions are licensed under Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0) terms. For details: <a target="_blank" href="https://creativecommons.org/licenses/by-sa/4.0/">https://creativecommons.org/licenses/by-sa/4.0/</a>.</li>
    <li>I hereby agree and confirm that the copyright to all data appearing in this website, including identifications annotated transcriptions and joins belong to the respective authors. I declare that I shall respect these rights whenever quoting them, to the authors and the Scripta Qumranica Electronica Platform.</li>
    <li>I agree to only publish materials on the platform of which I am their sole proprietor and creator which do not infringe upon any proprietary right at common law or any statutory copyright of any other person. The published material will not contain libelous or unlawful matter and will not make improper invasion of privacy of any other person.</li>
    <li>I agree that the managers of the site will have full discretion to delete or deny access to any content that they deem as inappropriate or in violation of the terms of use. I will not have any claim regarding such actions.</li>
    <li>I am aware that the participating institutions are not responsible for any demands, losses, costs, legal expenses, proceedings, and claims of any nature that may be taken or brought against them on grounds that the material published by me infringes any rights of any other person.</li>
    <li>I understand that the Platform is for research purposes, I am aware that the participating institutions are not responsible for any demands, losses, costs, legal expenses, proceedings, and claims of any nature that may occur to me regarding the use of the platform by me or by others, and regarding to claims resulting from my use of the platform or the use of others of the platform.</li>
    <li>The Scripta Qumranica Electronica Platform shall not be obligated to publish material that they believe breach any of these terms of use.</li>
    <li>The Scripta Qumranica Electronica Platform shall not be held responsible for data loss.</li>
    <li>The Scripta Qumranica Electronica Platform shall not be held responsible for any misuse of the platform by the public.</li>
    <li>The Scripta Qumranica Electronica Platform reserves the right to terminate accounts.</li>
    <li>The Scripta Qumranica Electronica Platform does not give any warranties.</li>
    <li>The Scripta Qumranica Electronica Platform is not liable for any mistakes on the platform. If you note any mistakes or misuse, please contact us at <a href="mailto:sqe@deadseascrolls.org.il">sqe@deadseascrolls.org.il</a>.</li>
    <li>Any user of the platform must give appropriate credit and may not do so in a way that suggests that the Platform endorses the use.</li>
</ol>
            </b-container>

        </b-modal>

    </div>
</template>


<script lang="ts">
import { Component, Prop, Emit, Vue } from 'vue-property-decorator';

@Component({
    name: 'EulaModal',
    components: {
    }
})

export default class EulaModal extends Vue {
    private shown(): void {
        console.log('Eula Modal');

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