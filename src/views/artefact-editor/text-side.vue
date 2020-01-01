<template>
    <div id="text-side" class="fixed-header">
        <input class="select-text" list="my-list-id" @change="load($event)" />
        <datalist id="my-list-id">
            <option :key="tf.textFragmentId" v-for="tf in dropdownTextFragmentsData">{{ tf.name }}</option>
        </datalist>
        <!-- <button
            @click.prevent="load(query)"
            :disabled="loading"
            name="Load"
            class="btn btn-secondary btn-position"
        >{{$t('misc.load')}}</button> -->
        <span class="isa_error">{{errorMessage}}</span>


        <div v-for="textFragment in displayedTextFragments" :key="textFragment.id" >
            <h3>{{textFragment.textFragmentName}}</h3>
            <div style="border: solid 1px;">
                <text-fragment
                :selectedSignInterpretation="selectedSignInterpretation"
                :fragment="textFragment"
                @sign-interpretation-clicked="onSignInterpretationClicked($event)"
                id="text-box"
            ></text-fragment> 
            </div>
             
        </div>
    </div>
</template>

<script lang="ts">
import { Component, Prop, Vue, Emit } from 'vue-property-decorator';
import { Artefact } from '@/models/artefact';
import {
    TextFragmentData,
    TextFragment,
    SignInterpretation,
    ArtefactTextFragmentData
} from '@/models/text';
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
    //private query = '';
    private loading = false;
     private textFragmentId = 0;

    private displayedTextFragments: TextFragment[] = [];

    private get editionId(): number {
        return parseInt(this.$route.params.editionId);
    }

    private get dropdownTextFragmentsData() {
        return this.allTextFragmentsData.filter(x => !x.certain);
    }

    private get displayedTextFragmentsData() {
        return this.allTextFragmentsData.filter(x => x.certain);
    }

    // private get displayedTextFragments() {
    //     if(!this.$state.textFragments.size){
    //         return;
    //     }
    //     return this.displayedTextFragmentsData.map(tfd => this.$state.textFragments.get(tfd.id));
    // }

     private get allTextFragmentsData() {
      const textFragments = this.$state.editions.current!.textFragments.map(
            tf => ArtefactTextFragmentData.createFromEditionTextFragment(tf)
        );
      let textFragmentsArtefact = this.$state.artefacts.current!.textFragments || [];   

        textFragments.forEach(EditionTf => {
            EditionTf.certain = textFragmentsArtefact.findIndex(ArtefactTf => ArtefactTf.id === EditionTf.id) > -1
        });
       

        return textFragments;
    }

    


    // private get textFragment(): TextFragment | undefined {
    //     return this.$state.textFragments.current;
    // }

    private async mounted() {
        await this.$state.prepare.artefact(this.editionId, this.artefact.id);
        this.displayedTextFragmentsData.forEach(async tfd => {
            await this.getFragmentText(tfd.id);
            const tf = this.$state.textFragments.get(tfd.id)
            if (tf) {
                this.displayedTextFragments.push(tf)
            }            
        });
    }


    private async load(event: Event) {
        console.log(this.displayedTextFragments, 'before')
        // TODO: Call when the dropdown selection changes (and not with the load button)
        // Load text fragment, add it to the beginning of the displayTextFragments array
        this.errorMessage = '';
        const textFragmentData = this.allTextFragmentsData.find(
           obj => obj.name === event.target.value
        );
        if (event.target.value) {
            if (!textFragmentData) {
                this.errorMessage = 'This fragment does not exist';
                return;
            }
           await this.getFragmentText(textFragmentData.id);
           const tf = this.$state.textFragments.get(textFragmentData.id);
           if(tf) {
               this.displayedTextFragments = [tf, ...this.displayedTextFragments];
           }
        }
        console.log(this.displayedTextFragments, 'after')
    }

    private async getFragmentText(textFragmentId: number) {
        this.loading = true;
        await this.$state.prepare.textFragment(
            this.editionId,
            textFragmentId
        );
        this.loading = false;
        //this.textFragmentSelected(this.textFragmentId);
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
.btn-position {
    margin-top: -5px;
}
.select-text {
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
