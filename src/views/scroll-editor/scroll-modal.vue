<template>
    <div>
        <b-modal id="scrollModal" @shown="scrollModalShown">
            <div>
                <form>
                    <!-- <b-form-select v-model="artefact" :options="artefacts"></b-form-select> -->
                    <b-form-select class="mb-3" @change="selectArtefact($event)">
                        <option
                            :value="art"
                            v-bind:key="art.id"
                            v-for="art in artefacts"
                        >{{ art.name }}</option>
                    </b-form-select>

                    <!-- <input class="select-text" list="my-list-id" @change="selectArtefact($event)" />
                    <datalist id="my-list-id">
                        <option :key="art.id" v-for="art in artefacts">{{ art.name }}</option>
                    </datalist>-->
                    <div v-if="isLoaded">
                        <!-- <artefact-card :artefact="artefact"></artefact-card> -->
                        <artefact-image :artefact="artefact"></artefact-image>
                    </div>
                </form>
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
// import ErrorService from '@/services/error';

@Component({
    name: 'scroll-modal',
    components: {
        'artefact-image': ArtefactImage,
        'artefact-card': artefactCardVue
    }
})
export default class ScrollModal extends Vue {
    private artefact: Artefact | undefined = {} as Artefact;
    private artefactService = new ArtefactService();

    private isLoaded = false;

    private async scrollModalShown() {
        this.isLoaded = false;
        console.log(this.$state.editions.current!.id, 'eeeeeeeeeeeeee');
        await this.$state.prepare.artefacts(this.$state.editions.current!.id);
    }

    private get artefacts() {
        console.log(this.$state.artefacts.items, 'ffffffffffffffffffff');
        return this.$state.artefacts.items || [];
    }

    private selectArtefact(art: Artefact) {
        this.isLoaded = false;
        console.log(art, 'event');
        setTimeout(() => {
            this.artefact = this.artefacts.find(a => a.id === art.id);
            this.isLoaded = true;
            console.log(this.artefact);
        }, 0);
    }
}
</script>


<style lang="scss" scoped>
</style>
