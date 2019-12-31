<template>
    <div id="text-side" class="fixed-header">
        <input class="select-text" list="my-list-id" v-model="query" @change="load(query)" />
        <datalist id="my-list-id">
            <option :key="tf.textFragmentId" v-for="tf in suggestedTextFragment">{{ tf.name }}</option>
        </datalist>
        <button @click.prevent="load(query)" :disabled="loading" name="Load" class="btn btn-secondary btn-position">{{$t('misc.load')}}</button>
        <span class="isa_error">{{errorMessage}}</span>
 
        <div v-if="textFragment">
            <text-fragment
                :selectedSignInterpretation="selectedSignInterpretation"
                :fragment="textFragment"
                @sign-interpretation-clicked="onSignInterpretationClicked($event)"
                id="text-box"
            ></text-fragment>
        </div>
    </div>
</template>

<script lang="ts">
import { Component, Prop, Vue, Emit } from 'vue-property-decorator';
import { Artefact } from '@/models/artefact';
import { TextFragmentData, TextFragment, SignInterpretation, ArtefactTextFragmentData } from '@/models/text';
import TextFragmentComponent from '@/components/text/text-fragment.vue';

@Component({
    name: 'text-side',
    components: {
        'text-fragment': TextFragmentComponent
    }
})
export default class TextSide extends Vue {
    @Prop() public artefact!: Artefact;
    @Prop() public selectedSignInterpretation!: SignInterpretation | null;
    private errorMessage = '';
    private query = '';
    private textFragmentId = 0;
    private loading = false;

    private get editionId(): number {
        return parseInt(this.$route.params.editionId);
    }
    private get suggestedTextFragment(): ArtefactTextFragmentData[]{
        return this.textFragments.filter(x=>!x.certain)
    }

    private get textFragments(): ArtefactTextFragmentData[] {
        let  textFragments = (this.$state.editions.current!.textFragments || [])
             .map(
                 x => ArtefactTextFragmentData.createFromEditionTextFragment(x)
             )
        let textFragmentsArtefact = this.$state.artefacts.current!.textFragments || [];   

        textFragments.forEach(EditionTf => {
            EditionTf.certain = textFragmentsArtefact.findIndex(ArtefactTf => ArtefactTf.id === EditionTf.id) > -1
        });
       
       return textFragments;
    }

    private get textFragment(): TextFragment | undefined {
        return this.$state.textFragments.current;
    }

    private async mounted() {
        this.$state.prepare.edition(this.editionId);
    }

    private load() {
        this.errorMessage = '';
        const textFragment = this.textFragments.find(
            (obj) => obj.name === this.query
        );
        if (this.query) {
            if (!textFragment) {
                this.errorMessage = 'This fragment does not exist';
                return;
            }
            this.textFragmentId = textFragment.id;
            this.getFragmentText();
        }
    }

    private async getFragmentText() {
        this.loading = true;
        await this.$state.prepare.textFragment(this.editionId, this.textFragmentId);
        this.loading = false;
        this.textFragmentSelected(this.textFragmentId);
    }

    private onSignInterpretationClicked(si: SignInterpretation) {
        this.signInterpretationClicked(si);
    }

    @Emit()
    private signInterpretationClicked(si: SignInterpretation) {
        return si;
    }

    @Emit()
    private textFragmentSelected(textFragmentId: number) {
        return textFragmentId;
    }
}
</script>

<style lang="scss" scoped>
#text-side {
    margin: 30px 15px 20px 30px;
    touch-action: pan-y;
    // top: 0;
    // right: 0;
}

button {
    margin-right: 10px;
}
.btn-info {
    background-color: #6c757d;
    border-color: #6c757d;
}

#text-box {
    margin-top: 30px;
     overflow: auto;
    display: grid;
    height: calc(100vh - 165px);
}

.isa_error {
    color: #d8000c;
}
.btn-position{
    margin-top:-5px;
}
.select-text{
    height: 37px;
    width: 190px;
    padding: 10px;
}
@media (max-width: 1100px) {
    #text-box {
    margin-top: 30px;
    overflow: auto;
    display: grid;
}
}

</style>
