<template>
    <div>
        <b-modal
            header-class="title-header"
            footer-class="title-footer"
            ref="FaqModalRef"
            id="FaqModal"
            aria-role="dialog"
            aria-label="FAQ Modal"
            scroll="keep"
            ok-only
            trap-focus
            :destroy-on-hide="true"
            size="lg"
        >
            <template v-slot:modal-header>
                <b-row>
                    <b-col cols="12"> <b>{{ `${$t('home.brand')} - ${$t('navbar.faq')}` }} </b> </b-col>
                </b-row>

            </template>

            <b-container fluid>
                <h2 id="where-can-i-find-out-about-the-scripta-qumranica-electronica-project-">Where can I find out about the Scripta Qumranica Electronica project?</h2>
                <p>You can find detailed information about the SQE project at <a target="_blank" href="https://qumranica.org">https://qumranica.org</a>.</p>
                <h2 id="do-you-have-any-instructional-materials-">Do you have any instructional materials?</h2>
                <p>Yes, you can access the instructional materials HERE.</p>
                <h2 id="why-can-t-i-find-my-favorite-scroll-">Why can&#39;t I find my favorite scroll?</h2>
                <p>Currently the SQE platform only contains material images by the IAA. So, you won&#39;t yet find scrolls from other places here, for instance: </p>
                <ul>
                <li>the great Isaiah scroll is housed at the Shrine of the Book</li>
                <li>the Copper Scroll is at the Jordan Museum in Amman</li>
                <li>several of the Cave 1 scrolls are at the BNF</li>
                <li>there are still others scattered in collections around the world</li>
                </ul>
                <p>You will find, however, that we have included a few scrolls/manuscripts from outside the IAA in order to prove that our technology can work with outside data. We include images of 1Q7 from the Bibliothèque nationale de France and also images of the Cairo Geniza Damascus Document (T-S 10K6 and T-S 16.311) from the University of Cambridge Digital Library.</p>
                <h2 id="i-am-looking-for-a-manuscript-that-is-part-of-the-iaa-collection-why-can-t-i-find-it-">I am looking for a manuscript that is part of the IAA collection, why can&#39;t I find it?</h2>
                <p>We are still working on organizing some of the IAA images, they will come available as soon as we are able to fix the cataloging issues and any problems with the state of the images.</p>
                <h2 id="how-were-the-fragments-masked-in-the-images-and-why-don-t-they-always-look-right-">How were the fragments masked in the images, and why don&#39;t they always look right?</h2>
                <p>The computer science team of the SQE project, led by Nachum Dershowitz, developed a process to automatically find the region of the fragment in an image. Sometimes, this process works great, other times it fails.</p>
                <p>The good news is that as a registered user you can change the mask yourself and label the fragments however you wish.</p>
                <h2 id="how-come-i-see-the-wrong-text-next-to-a-fragment-">How come I see the wrong text next to a fragment?</h2>
                <p>At first our matching of fragments in an image to the transcribed text is based upon cataloging data, which was not always complete or consistent. The usage of one referencing system for the images and a different one for the texts caused many difficulties, and we have not manually fixed all the errors and lacunae yet.</p>
                <p>You can always choose proper text reference yourself, and once you link a letter in the transcription to a letter on the fragment, the proper connection between image and transcription will be made for you.</p>
            </b-container>

        </b-modal>

    </div>
</template>


<script lang="ts">
import { Component, Prop, Emit, Vue } from 'vue-property-decorator';

@Component({
    name: 'Faq',
    components: {
    }
})

export default class FaqModal extends Vue {
}

</script>
<style lang="scss" scoped>
@import '@/assets/styles/_variables.scss';
@import '@/assets/styles/_fonts.scss';
@import '@/assets/styles/_modals.scss';
</style>