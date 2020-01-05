<template>
    <div id="text-side" class="fixed-header">
        <input class="select-text" list="my-list-id" @change="load($event)" />
        <datalist id="my-list-id">
            <option :key="tf.textFragmentId" v-for="tf in dropdownTextFragmentsData">{{ tf.name }}</option>
        </datalist>
        <span class="isa_error">{{errorMessage}}</span>

        <div v-for="(textFragment, index) in displayedTextFragments" :key="textFragment.id">
            <h3>{{textFragment.textFragmentName}}</h3>
            <button @click="toggleShow(textFragment.id)">{{ isTfShown(textFragment.id) ? 'Close' : 'Open' }}</button>
            <div style="border: solid 1px;" v-show="isTfShown(textFragment.id)">
                <text-fragment
                    :selectedSignInterpretation="selectedSignInterpretation"
                    :fragment="textFragment"
                    @sign-interpretation-clicked="onSignInterpretationClicked($event)"
                    id="text-box"
                ></text-fragment>
            </div>

            <button @click="changePosition(index)">change</button>
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
    private displayedTextFragmentsShow: { [key: number]: boolean } = {};
    private get editionId(): number {
        return parseInt(this.$route.params.editionId);
    }

    private get dropdownTextFragmentsData() {
        return this.allTextFragmentsData.filter(x => !x.certain);
    }

    private get displayedTextFragmentsData() {
        return this.allTextFragmentsData.filter(x => x.certain);
    }

    private isTfShown(tfId: number) {
        return this.displayedTextFragmentsShow[tfId];
    }

    private get allTextFragmentsData() {
        const textFragments = this.$state.editions.current!.textFragments.map(
            tf => ArtefactTextFragmentData.createFromEditionTextFragment(tf)
        );
        let textFragmentsArtefact =
            this.$state.artefacts.current!.textFragments || [];

        textFragments.forEach(EditionTf => {
            EditionTf.certain =
                textFragmentsArtefact.findIndex(
                    ArtefactTf => ArtefactTf.id === EditionTf.id
                ) > -1;
        });

        return textFragments;
    }

    private async mounted() {
        await this.$state.prepare.artefact(this.editionId, this.artefact.id);
        this.displayedTextFragmentsData.forEach(async (tfd, idx) => {
            await this.getFragmentText(tfd.id);
            const tf = this.$state.textFragments.get(tfd.id);
            if (tf) {
                this.displayedTextFragments.push(tf);
                this.displayedTextFragmentsShow[tfd.id] =
                    idx === 0 ? true : false;
            }
        });
    }

    private async load(event: Event) {
        this.errorMessage = '';
        const textFragmentData = this.allTextFragmentsData.find(
            obj => obj.name === event.target.value
        );
        if (event.target.value) {
            if (!textFragmentData) {
                this.errorMessage = 'This fragment does not exist';
                return;
            }

            let index = this.displayedTextFragments.findIndex(x => {
                return (
                    this.dropdownTextFragmentsData.find(y => y.id === x.id) !==
                    undefined
                );
            });
            if (index > -1) {
                this.displayedTextFragments.splice(index, 1);
            }

            await this.getFragmentText(textFragmentData.id);
            const tf = this.$state.textFragments.get(textFragmentData.id);

            if (tf) {
                console.log(textFragmentData.id, 'textFragmentData');

                this.displayedTextFragments = [
                    tf,
                    ...this.displayedTextFragments
                ];

                this.toggleShow(tf.id);
            }
        }
    }

    private changePosition(index:number){
        if (index - 1 >= 0) {
            const temp = this.displayedTextFragments[index];
            this.displayedTextFragments[index] = this.displayedTextFragments[index - 1];
            this.displayedTextFragments[index - 1] = temp;
            this.displayedTextFragments = [...this.displayedTextFragments];
        }
    }

    private toggleShow(tfId: number) {
        Object.keys(this.displayedTextFragmentsShow).forEach(key => {
            if (+key !== tfId) {
                this.displayedTextFragmentsShow[+key] = false;
            }
        });
        this.displayedTextFragmentsShow[tfId] = !this.displayedTextFragmentsShow[tfId]; // open the corresponding box
        this.displayedTextFragmentsShow = { ...this.displayedTextFragmentsShow }; // ??? copy to  update the view
    }

    private async getFragmentText(textFragmentId: number) {
        this.loading = true;
        await this.$state.prepare.textFragment(this.editionId, textFragmentId);
        this.loading = false;
        //this.textFragmentSelected(this.textFragmentId);
    }

    private onSignInterpretationClicked(si: SignInterpretation) {
        const siTextFragment = si.sign.line.textFragment;
        const tf = this.$state.artefacts.current!.textFragments.find(
            x => x.id === siTextFragment.textFragmentId
        );
        if (!tf) {
            this.$state.artefacts.current!.textFragments.push({
                id: siTextFragment.textFragmentId,
                name: siTextFragment.textFragmentName,
                editorId: siTextFragment.editorId,
                certain: true
            });
        }
        console.log(this.$state.artefacts.current!.textFragments, 'qsdq');
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
