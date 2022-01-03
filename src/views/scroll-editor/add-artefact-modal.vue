<template>
    <div>
        <b-modal
            scrollable
            ref="addArtefactModalRef"
            id="addArtefactModal"
            footer-class="footer"
            header-class="header"
            :title="'Choose Artefacts'"
            @shown="scrollModalShown"
        >
            <div class="row modal-body">
                <div class="col-6">
                    <div >
                        <b-form-group >
                            <b-form-input
                                id="searchValue"
                                size="sm"
                                placeholder="Search..."
                                v-model="searchValue"
                            ></b-form-input>
                        </b-form-group>
                    </div>
                    <div>
                        <b-form-checkbox-group
                            id="cheked-artefact"
                            v-model="chekedArtefacts"
                            name="cheked-artefacts"
                        >
                            <div
                                v-for="art in filteredArtefacts"
                                @click="selectArtefact(art.id)"
                                v-bind:key="art.id"
                                :class="{
                                    selected: isSelectedArtefact(art.id),
                                }"
                            >
                                <b-form-checkbox
                                    type="checkbox"
                                    :value="art.id"
                                >
                                    <span>{{ art.name }} - {{ art.side }}</span>
                                </b-form-checkbox>
                            </div>
                        </b-form-checkbox-group>
                    </div>
                </div>
                <div class="col-6">
                    <div v-if="isLoaded">
                        <artefact-image :artefact="artefact"></artefact-image>
                    </div>
                </div>
            </div>
            <template #modal-footer>
                <div class="w-100">
                    <div
                        style="
                            display: flex;
                            flex-direction: row;
                            justify-content: space-between;
                        "
                    >
                        <div>
                            <b-button
                                size="sm"
                                class="btn btn-primary mr-2"
                                @click="checkedAllSide('recto')"
                            >
                                Recto
                            </b-button>
                            <b-button
                                size="sm"
                                class="btn btn-primary"
                                @click="checkedAllSide('verso')"
                            >
                                Verso
                            </b-button>
                        </div>
                        <div>
                            <b-button
                                size="sm"
                                class="btn btn-primary mr-2"
                                @click="closeModal()"
                                :disabled="!chekedArtefacts.length"
                            >
                                Add
                            </b-button>
                            <b-button
                                size="sm"
                                class="btn btn-primary"
                                @click="uncheckAll()"
                            >
                                Clear
                            </b-button>
                        </div>
                    </div>
                </div>
            </template>
        </b-modal>
    </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import ArtefactImage from '@/components/artefact/artefact-image.vue';
import { Artefact } from '@/models/artefact';
import { Side } from '@/models/misc';

@Component({
    name: 'add-artefact-modal',
    components: {
        'artefact-image': ArtefactImage,
    },
})
export default class AddArtefactModal extends Vue {
    private artefact: Artefact | undefined = {} as Artefact;
    public chekedArtefacts: number[] = [];
    public searchValue: string = '';
    private isLoaded = false;

    private async scrollModalShown() {
        this.isLoaded = false;
        await this.$state.prepare.artefacts(this.$state.editions.current!.id);
    }

    private checkedAllSide(side: Side) {

        this.chekedArtefacts = this.nonPlacedArtefacts
            .filter((x: Artefact) => x.name.toLowerCase().includes(this.searchValue.toLowerCase()) && x.side === side)
            .map((x) => x.id);
    }

    private get artefacts() {
        return this.$state.artefacts.items || [];
    }

    private get nonPlacedArtefacts() {
        return this.artefacts.filter((x) => !x.isPlaced);
    }

    public get filteredArtefacts() {
        this.chekedArtefacts = [];
        return this.nonPlacedArtefacts.filter((x: Artefact) => x.name.toLowerCase().includes(this.searchValue.toLowerCase()) && x.side === x.side);
    }

    public isSelectedArtefact(artId: number): boolean {
        return this.artefact!.id === artId;
    }

    private selectArtefact(id: number) {
        this.isLoaded = false;

        setTimeout(() => {
            this.artefact = this.artefacts.find((a) => a.id === id);
            this.isLoaded = true;
        }, 0);
    }

    private closeModal() {
        (this.$refs.addArtefactModalRef as any).hide(this.chekedArtefacts);
    }

    private uncheckAll() {
        this.chekedArtefacts = [];
    }
}
</script>


<style lang="scss" scoped>
.selected {
    border: solid 2px blue;
}
.modal-body {
    height: 30vh;
    overflow-y: auto;
}
</style>
