<template>
    <div id="text-side" class="fixed-header">
        <input
            v-if="!readOnly"
            class="select-text"
            list="my-list-id"
            @change="loadFragment($event)"
        />
        <datalist id="my-list-id">
            <option :key="tf.textFragmentId" v-for="tf in dropdownTextFragmentsData">{{ tf.name }}</option>
        </datalist>
        <span class="isa_error">{{ errorMessage }}</span>

        <div
            v-for="(textFragment, index) in displayedTextFragments"
            :key="textFragment.id"
            role="tablist"
        >
            <b-card-header header-tag="header" class="p-1">
                <b-row>
                    <b-col cols="2">
                        <b-button-group block>
                            <b-button
                                href="#"
                                @click="changePosition(index, true)"
                                v-b-tooltip.hover.bottom
                                :title="$t('misc.up')"
                            >
                                <i class="fa fa-arrow-up"></i>
                            </b-button>
                            <b-button
                                href="#"
                                @click="changePosition(index, false)"
                                v-b-tooltip.hover.bottom
                                :title="$t('misc.down')"
                            >
                                <i class="fa fa-arrow-down"></i>
                            </b-button>
                        </b-button-group>
                    </b-col>
                    <b-col cols="10" role="tab">
                        <b-button
                            block
                            href="#"
                            v-b-toggle="'accordion-' + index"
                            variant="info"
                        >{{ textFragment.textFragmentName }}</b-button>
                    </b-col>
                </b-row>
            </b-card-header>

            <b-collapse
                :id="'accordion-' + index"
                :visible="index === 0"
                accordion="my-accordion"
                role="tabpanel"
            >
                <text-fragment
                    :fragment="textFragment"
                    id="text-box"
                ></text-fragment>
            </b-collapse>
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
    ArtefactTextFragmentData,
} from '@/models/text';
import TextFragmentComponent from '@/components/text/text-fragment.vue';
import { EditionInfo } from '@/models/edition';

@Component({
    name: 'text-side',
    components: {
        'text-fragment': TextFragmentComponent,
    },
})
export default class TextSide extends Vue {
    @Prop() public artefact!: Artefact;

    // @Prop() public selectedSignInterpretation!: SignInterpretation | null;
    private errorMessage = '';
    private loading = false;
    private textFragmentId = 0;

    private displayedTextFragments: TextFragment[] = [];
    private displayedTextFragmentsShow: { [key: number]: boolean } = {};
    private get editionId(): number {
        return parseInt(this.$route.params.editionId);
    }

    private get readOnly(): boolean {
        return this.$state.editions.current!.permission.readOnly;
    }

    private get dropdownTextFragmentsData() {
        return this.allTextFragmentsData.filter((x) => !x.certain);
    }

    private get displayedTextFragmentsData() {
        return this.allTextFragmentsData.filter((x) => x.certain);
    }

    private isTfShown(tfId: number) {
        return this.displayedTextFragmentsShow[tfId];
    }

    private get allTextFragmentsData() {
        const textFragments = this.$state.editions.current!.textFragments.map(
            (tf) => ArtefactTextFragmentData.createFromEditionTextFragment(tf)
        );
        const textFragmentsArtefact =
            this.$state.artefacts.current!.textFragments || [];

        textFragments.forEach((editionTf) => {
            editionTf.certain =
                textFragmentsArtefact.findIndex(
                    (artefactTf) =>
                        artefactTf.id === editionTf.id && artefactTf.certain
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

    private async loadFragment(event: Event) {
        const target = event.target as HTMLInputElement;
        this.errorMessage = '';
        const textFragmentData = this.allTextFragmentsData.find(
            (obj) => obj.name === target.value
        );
        if (target.value) {
            if (!textFragmentData) {
                this.errorMessage = 'This fragment does not exist';
                return;
            }

            const index = this.displayedTextFragments.findIndex((x) => {
                return (
                    this.dropdownTextFragmentsData.find(
                        (y) => y.id === x.id
                    ) !== undefined
                );
            });
            if (index > -1) {
                this.displayedTextFragments.splice(index, 1);
            }

            await this.getFragmentText(textFragmentData.id);
            const tf = this.$state.textFragments.get(textFragmentData.id);

            if (tf) {
                this.displayedTextFragments = [
                    tf,
                    ...this.displayedTextFragments,
                ];
            }
        }
    }

    private changePosition(index: number, up: boolean) {
        const indexToChange = up ? index - 1 : index + 1;
        const isInBoudaries = up
            ? indexToChange >= 0
            : indexToChange < this.displayedTextFragments.length;
        if (isInBoudaries) {
            const temp = this.displayedTextFragments[index];
            this.displayedTextFragments[index] = this.displayedTextFragments[
                indexToChange
            ];
            this.displayedTextFragments[indexToChange] = temp;
            this.displayedTextFragments = [...this.displayedTextFragments];
        }
    }

    private async getFragmentText(textFragmentId: number) {
        this.loading = true;
        await this.$state.prepare.textFragment(this.editionId, textFragmentId);
        this.loading = false;
        // this.textFragmentSelected(this.textFragmentId);
    }


    // @Emit()
    // private signInterpretationClicked(si: SignInterpretation) {
    //     return si;
    // }

    @Emit()
    private textFragmentSelected(textFragmentId: number) {
        return textFragmentId;
    }

    @Emit()
    private textFragmentsLoaded() {
        // Let the artefact editor know we've loaded all the initial ROIs
    }
}
</script>

<style lang="scss" scoped>
@import '@/assets/styles/_variables.scss';
#text-side {
    padding: 30px 15px 20px 30px;
    touch-action: pan-y;
    height: 90%;
    overflow: auto;
}

button {
    margin-right: 10px;
}
.btn-info {
    background-color: #6c757d;
    border-color: #6c757d;
}

#text-box {
    font-family: 'SBL Hebrew';
    font-size: 18px;
    margin-top: 30px;
    overflow: auto;
    display: grid;
    direction: rtl;
}

.isa_error {
    color: $red;
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
