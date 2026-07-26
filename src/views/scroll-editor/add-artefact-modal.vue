<template>
    <div>
        <b-modal lazy
            scrollable
            v-model="modalVisible"
            id="addArtefactModal"
            footer-class="footer"
            header-class="header"
            :title="'Choose Artefacts'"
            @shown="scrollModalShown"
        >
            <div class="row modal-body">
                <div class="col-6">
                    <div>
                        <b-form-group>
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
            <template #footer>
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
                                class="btn btn-primary me-2"
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
                                class="btn btn-primary me-2"
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
import { Component, Vue, toNative } from 'vue-facing-decorator';
import { registerModalListener } from '@/utils/modal-bus';
import ArtefactImage from '@/components/artefact/artefact-image.vue';
import { Artefact } from '@/models/artefact';
import { Side } from '@/models/misc';

@Component({
    name: 'add-artefact-modal',
    components: {
        'artefact-image': ArtefactImage,
    },
})
class AddArtefactModal extends Vue {
    public artefact: Artefact | undefined = {} as Artefact;
    public chekedArtefacts: number[] = [];
    public searchValue: string = '';
    public isLoaded = false;
    // bootstrap-vue-next: v-model on b-modal controls visibility
    public modalVisible: boolean = false;
    private disposeModalListener?: () => void;

    public mounted() {
        this.disposeModalListener = registerModalListener(
            'addArtefactModal',
            () => { this.modalVisible = true; },
            () => { this.modalVisible = false; },
        );
    }

    public beforeUnmount() {
        this.disposeModalListener?.();
    }

    /** Called by parent via $refs to open the modal (replaces bv::show::modal event). */
    public show() {
        this.modalVisible = true;
    }

    public async scrollModalShown() {
        this.isLoaded = false;
        await this.$state.prepare.artefacts(this.$state.editions.current!.id);
    }

    public checkedAllSide(side: Side) {
        this.chekedArtefacts = this.nonPlacedArtefacts
            .filter(
                (x: Artefact) =>
                    x.name
                        .toLowerCase()
                        .includes(this.searchValue.toLowerCase()) &&
                    x.side === side
            )
            .map((x) => x.id);
    }

    public get artefacts() {
        return this.$state.artefacts.items || [];
    }

    public get nonPlacedArtefacts() {
        return this.artefacts.filter((x) => !x.isPlaced);
    }

    public get filteredArtefacts() {
        this.chekedArtefacts = [];
        return this.nonPlacedArtefacts.filter(
            (x: Artefact) =>
                x.name.toLowerCase().includes(this.searchValue.toLowerCase()) &&
                x.side === x.side
        );
    }

    public isSelectedArtefact(artId: number): boolean {
        return this.artefact!.id === artId;
    }

    public selectArtefact(id: number) {
        this.isLoaded = false;

        setTimeout(() => {
            this.artefact = this.artefacts.find((a) => a.id === id);
            this.isLoaded = true;
        }, 0);
    }

    public closeModal() {
        // bootstrap-vue-next: hide via v-model; emit selected IDs to parent
        // TODO(vue3): parent (scroll-editor.vue) must be updated to listen for @close
        //             instead of 'bv::modal::hide' with modalId === 'addArtefactModal'
        this.$emit('close', this.chekedArtefacts);
        this.modalVisible = false;
        this.uncheckAll();
    }

    public uncheckAll() {
        this.searchValue = '';
        this.chekedArtefacts = [];
    }
}
export default toNative(AddArtefactModal);
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
