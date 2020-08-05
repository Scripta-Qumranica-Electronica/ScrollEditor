<template>
    <div>
        <b-modal
            ref="addArtefactModalRef"
            id="addArtefactModal"
            hide-footer
            @shown="scrollModalShown"
        >
            <div>
                <form>
                    <b-form-select id="custom-select" class="mb-3" @change="selectArtefact($event)">
                        <option
                            :value="art"
                            v-bind:key="art.id"
                            v-for="art in nonPlacedArtefacts"
                        >{{ art.name }} - {{art.side}}</option>
                    </b-form-select>

                    <div v-if="isLoaded">
                        <artefact-image :artefact="artefact"></artefact-image>
                    </div>
                </form>
                <div class="modal-footer">
                    <button type="button" class="btn btn-primary" @click="closeModal()">Add</button>
                </div>
            </div>
        </b-modal>
    </div>
</template>

<script lang="ts">
import { Component, Prop, Vue, Emit, Watch } from 'vue-property-decorator';
import { EditionInfo, ShareInfo, SimplifiedPermission } from '@/models/edition';
import EditionService from '@/services/edition';
import { ImagedObject } from '@/models/imaged-object';
import { BvModalEvent } from 'bootstrap-vue';
import ArtefactImage from '@/components/artefact/artefact-image.vue';
import ArtefactService from '@/services/artefact';
import { Artefact } from '@/models/artefact';
import artefactCardVue from '../edition/components/artefact-card.vue';

@Component({
    name: 'add-artefact-modal',
    components: {
        'artefact-image': ArtefactImage
    }
})
export default class AddArtefactModal extends Vue {
    private artefact: Artefact | undefined = {} as Artefact;
    private artefactService = new ArtefactService();

    private isLoaded = false;

    private async scrollModalShown() {
        this.isLoaded = false;
        await this.$state.prepare.artefacts(this.$state.editions.current!.id);
    }

    private get artefacts() {
        return this.$state.artefacts.items || [];
    }
    private get nonPlacedArtefacts() {
        return this.artefacts.filter(x => !x.isPlaced);
    }

    private selectArtefact(art: Artefact) {
        this.isLoaded = false;
        setTimeout(() => {
            this.artefact = this.artefacts.find(a => a.id === art.id);
            this.isLoaded = true;
        }, 0);
    }

    private closeModal() {
        (this.$refs.addArtefactModalRef as any).hide(this.artefact!.id);
    }
}
</script>


<style lang="scss" scoped>
</style>
