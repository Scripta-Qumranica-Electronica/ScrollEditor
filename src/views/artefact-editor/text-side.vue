<template>
    <div class="text-side-container" >
        <div class="border-bottom load-fragment" v-if="artefactMode">
            <input
                class="select-text"
                placeholder="Enter a name e.g, col.1"
                list="my-list-id"
                @input="loadFragment($event)"
                type="text"
                onfocus="this.value=''"
                onchange="this.blur();"
            />
            <datalist id="my-list-id">
                <option
                    v-for="tf in dropdownTextFragmentsData"
                    :key="tf.textFragmentId"
                >
                    {{ tf.name }}
                </option>
            </datalist>
            <span class="isa_error">{{ errorMessage }}</span>
        </div>
        <div id="text-side" class="fixed-header">
            <div
                v-for="(textFragment, index) in displayedTextFragments"
                :key="textFragment.id"
                role="tablist"
                class="text-side-border p-2"
                direction="rtl"
            >
                <b-card-header header-tag="header" class="p-0 mt-3">
                    <b-row no-gutters>
                        <div style="width:80px;"  v-if="artefactMode">
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
                        </div>
                        <div class="col" role="tab">
                            <b-button
                                block
                                href="#"
                                v-b-toggle="'accordion-' + index"
                                >{{ textFragment.textFragmentName }}</b-button
                            >
                        </div>
                    </b-row>
                </b-card-header>

                <b-collapse
                    :id="'accordion-' + index"
                    :visible="index === openedTextFragement"
                    accordion="my-accordion"
                    role="tabpanel"
                    @show="emptySelectedState(textFragment.textFragmentId)"
                    direction="rtl"
                >
                    <text-fragment
                        :fragment="textFragment"
                        id="text-box"
                    ></text-fragment>
                </b-collapse>
            </div>
        </div>
        <edit-sign-modal></edit-sign-modal>
    </div>
</template>

<script lang="ts">
import { Component, Prop, Vue, Emit } from 'vue-property-decorator';
import { Artefact } from '@/models/artefact';
import { TextFragment, ArtefactTextFragmentData } from '@/models/text';
import TextFragmentComponent from '@/components/text/text-fragment.vue';
import EditSignModal from '@/components/text/edit-sign-modal.vue';
import { ArtefactEditorMode } from './types';

@Component({
    name: 'text-side',
    components: {
        'text-fragment': TextFragmentComponent,
        'edit-sign-modal': EditSignModal,
    },
})
export default class TextSide extends Vue {
    @Prop() public artefact!: Artefact;
    @Prop({ default: 'artefact'})
    public editorMode!: ArtefactEditorMode;
    @Prop() public textFragment!: TextFragment;

    private get artefactMode() {
        return this.editorMode === 'artefact';
    }

    private get textFragmentMode() {
        return this.editorMode === 'text-fragment';
    }

    // @Prop() public selectedSignInterpretation!: SignInterpretation | null;
    private errorMessage = '';
    private loading = false;
    private textFragmentId = 0;

    private displayedTextFragments: TextFragment[] = []; // Text fragments that are going to be displayed
    private displayedTextFragmentsShow: { [key: number]: boolean } = {}; // Map - form text fragment id to boolean
    private get editionId(): number {
        return parseInt(this.$route.params.editionId);
    }

    private get readOnly(): boolean {
        return this.$state.editions.current!.permission.readOnly;
    }

    private get dropdownTextFragmentsData() {
        const displayedTfIds = this.displayedTextFragments.map((tf) => tf.id);
        return this.allTextFragmentsData.filter(
            (x) => (!x.certain || !x.suggested)  && !displayedTfIds.includes(x.id)
        );
    }

    private get displayedTextFragmentsData() {
        // Try first to get 'certain' matches,
        // if there are none, then fall back to 'suggested' (which might also be none)
        const certain = this.allTextFragmentsData.filter((x) => x.certain);
        console.info(this.allTextFragmentsData.filter((x) => x.suggested));
        return certain.length > 0 ? certain : this.allTextFragmentsData.filter((x) => x.suggested);
    }

    private get openedTextFragement() {
        if (this.$state.textFragmentEditor.singleSelectedSi) {
            const tfId = this.$state.textFragmentEditor.singleSelectedSi.sign.line
                .textFragment.textFragmentId;
            return this.displayedTextFragments.findIndex(
                (tf) => tf.id === tfId
            );
        }
        return 0;
    }

    private isTfShown(tfId: number) {
        return this.displayedTextFragmentsShow[tfId];
    }

    private get allTextFragmentsData() {
        let textFragments = this.$state.editions.current!.textFragments.map(
            (tf) => ArtefactTextFragmentData.createFromEditionTextFragment(tf)
        );
        const textFragmentsArtefact =
            this.$state.artefacts.current!.textFragments || [];

        textFragments = textFragments.map((editionTf) => {
            for (const artefactTf of textFragmentsArtefact) {
                if (artefactTf.id === editionTf.id) {
                    editionTf.suggested = editionTf.suggested || artefactTf.suggested;
                    editionTf.certain = editionTf.certain || artefactTf.certain;
                }
            }
            return editionTf;
        });
        // textFragments = textFragments.map((editionTf) => {
        //     // Copy the suggested and certain attributes for TFs matching the artefactId
        //     textFragmentsArtefact.forEach((artefactTf) => {
        //         if (artefactTf.id === editionTf.id) {
        //             editionTf.suggested = artefactTf.suggested;
        //             editionTf.certain = artefactTf.certain;
        //         }
        //     });

        //     return editionTf;
        // });

        return textFragments;
    }

    private async mounted() {
        await this.$state.prepare.artefact(this.editionId, this.artefact.id);
        if (this.textFragmentMode) {
            this.displayedTextFragments = [this.textFragment];
            this.displayedTextFragmentsShow[this.textFragment.id] = true;
        } else {
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

            const tfIdsToDelete = this.allTextFragmentsData
                .filter((tfData) => !tfData.certain)
                .map((t) => t.id);
            this.displayedTextFragments.forEach((x, index) => {
                if (tfIdsToDelete.includes(x.id)) {
                    this.displayedTextFragments.splice(index, 1);
                }
            });

            await this.getFragmentText(textFragmentData.id);
            const tf = this.$state.textFragments.get(textFragmentData.id);

            if (tf) {
                this.displayedTextFragments = [
                    tf,
                    ...this.displayedTextFragments,
                ];
            }
            this.emptySelectedState();
        }
    }
    private emptySelectedState(id?: number) {
        if (
            id &&
            this.$state.textFragmentEditor.singleSelectedSi &&
            this.$state.textFragmentEditor.singleSelectedSi.sign.line.textFragment
                .textFragmentId === id
        ) {
            return;
        }
        this.$state.textFragmentEditor.selectedSignInterpretations = [];
        this.$state.artefactEditor.selectRoi(null);
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
.text-side-container {
    height: calc(60vh - 2rem);
    /* height: calc(100vh - 285px); */
}
.load-fragment {
    height: 71px;
    padding: 15px;
    text-align: right;
    padding-right: 31px;
}
#text-side {
    touch-action: pan-y;
    height: 98%;
    /* overflow-y: auto; */
    overflow-x: hidden;
    margin-right: 15px;

}

@media (max-width: 1100px) {
   #text-side {
        overflow-y: scroll;
        /* height: calc(100% - 80px); */
    }
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
    overflow-x: overlay;
    padding-bottom: 16px;
    padding-right: 0.1rem;
    margin-right:0.1rem;
    /* display: grid; */
    display:flex;
    justify-content: flex-start;
    direction: rtl;
}

@media (max-width: 1100px) {
    #text-box {
        margin-top: 10px;
        overflow: auto;
    }
}

.isa_error {
    color: $red;
}
.btn-position {
    margin-top: -5px;
}
.select-text {
    height: 37px;
    width: 100%;
    padding: 10px;
}


a.btn.btn-secondary {
    background-color: white;
    border-radius: 0px;
    color: grey;
}
a.btn.btn-info.btn-block.not-collapsed {
    border-radius: 0px;
    background-color: white;
    color: grey;
}
.btn-secondary:hover,
.btn-secondary.disabled {
    background-color: white !important;
}
</style>
