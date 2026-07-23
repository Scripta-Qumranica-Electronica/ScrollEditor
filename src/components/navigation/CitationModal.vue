<template>
    <div>
        <b-modal lazy
            v-model="visible"
            header-class="title-header"
            footer-class="title-footer"
            id="CitationModal"
            aria-label="Citation Modal"
            size="lg"
            ok-only
            :destroy-on-hide="true"
        >
            <template v-slot:modal-header>
                <b-row>
                    <b-col cols="12"> <b>{{ `${$t('home.brand')} - Citation` }} </b> </b-col>
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
                    Text © Reinhard G. Kratz
                </p>
                <p>
                    Provided by Reinhard G. Kratz, Ingo Kottsieper, and Annette Steudel on the basis of a text provided by the Qumran-Wörterbuch of the Göttingen Academy of Sciences, which is based upon a preliminary text provided by Martin Abegg.
                </p>
                <p>This work is licensed under the Creative Commons Attribution-ShareAlike 4.0 International License. To view a copy of this license, visit <a href="https://creativecommons.org/licenses/by-sa/4.0/legalcode">https://creativecommons.org/licenses/by-sa/4.0/legalcode</a> or send a letter to Creative Commons, PO Box 1866, Mountain View, CA 94042, USA.
                </p>
            </b-container>

        </b-modal>

    </div>
</template>


<script lang="ts">
import { Component, Vue, toNative } from 'vue-facing-decorator';

@Component({
    name: 'Citation',
    components: {
    }
})
class CitationModal extends Vue {
    public visible = false;

    public show() {
        this.visible = true;
    }
}
export default toNative(CitationModal);
</script>
<style lang="scss" scoped>
@import '@/assets/styles/_variables.scss';
@import '@/assets/styles/_fonts.scss';
@import '@/assets/styles/_modals.scss';
</style>