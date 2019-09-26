<template>
    <div>
        <div v-if="!artefacts"><div class="col ml-auto"><Waiting></Waiting></div></div>
        <div v-if="artefacts">
            <div class="flex">
                <b-form inline class="mt-2 filtering" @submit.prevent="">
                    <label for="filter">{{ $t('home.filterArtefacts') }}:</label>
                    <b-form-input v-model="filter" name="filter" class="ml-2"></b-form-input>
                </b-form>
                    
                <b-dropdown :text="sideFilter.displayName" size="sm" class="ml-2 filtering">
                    <b-dropdown-item 
                    v-for="filter in sideOptions" 
                    :key="filter.displayName"
                    @click="sideFilterChanged(filter)">{{filter.displayName}}</b-dropdown-item>
                </b-dropdown>
                <small class="mt-3">{{ $t('home.artefacts') }}: {{ numberOfArtefacts }}</small>
            </div>
            <ul class="list-unstyled row mt-2"  v-if="artefacts.length">
                <li class="col-sm-6 col-md-4 col-xl-2 list-item"
                    v-for="art in artefacts"
                    v-show="filteredArtefact.indexOf(art.id) !== -1"
                    :key="art.id">
                    <artefact-card :artefact="art"></artefact-card>
                </li>
            </ul>
        </div>
    </div>
</template>

<script lang="ts">
import Vue from 'vue';
import Waiting from '@/components/misc/Waiting.vue';
import EditionService from '@/services/edition';
import { Artefact } from '../../../models/artefact';
import ArtefactCard from './artefact-card.vue';
import { countIf } from '../../../utils/helpers';
import { SideOption } from '../../imaged-object-editor/types';
import ImagedObjectService from '@/services/imaged-object';

export default Vue.extend({
    data() {
        return {
            editionService: new EditionService(),
            imagedObjectService: new ImagedObjectService(),
            sideOptions: [
                {displayName: 'Recto', name: 'recto'},
                {displayName: 'Verso', name: 'verso'},
                {displayName: 'Both', name: 'recto and verso'}],
            sideFilter: {} as SideOption,
            filter: '',
        };
    },
    components: {
        ArtefactCard,
        Waiting,
    },
    computed: {
        artefacts(): Artefact[] | undefined {
            if (this.$state.artefacts.items) {
                return this.$state.artefacts.items;
            }
            return undefined;
        },
        numberOfArtefacts(): number {
            if (!this.artefacts) {
                return 0;
            } else {
                return countIf(this.artefacts, (art) => this.nameMatch(art.name));
            }
        },
        filteredArtefact(): number[] {
            if (this.$state.artefacts.items) {
                return this.$state.artefacts.items.filter((x) => ( this.filter === ''
                        || this.nameMatch(x.name) ) // Filter for user input
                        && ( this.sideFilter.name && this.sideFilter.name.indexOf(x.side) !== -1 ) // Filter for side
                    ).map((x) => x.id);
            }

            return [];
        },
    },
    created() {
        // ignore cache, because we want to load data from server when become to another version of edition
        this.imagedObjectService.getEditionImagedObjects(true);
        this.editionService.getArtefacts(true);

        this.sideFilter = this.sideOptions[2];
    },
    methods: {
        sideFilterChanged(filter: SideOption) {
            this.sideFilter = filter;
        },
        nameMatch(name: string): boolean {
          return name.toLowerCase().indexOf(this.filter.toLowerCase()) !== -1;
      }
    }
});
</script>

<style scoped>
.filtering {
    margin: 10px 10px 10px 0px;
}

.flex {
    display: flex;
}
</style>
