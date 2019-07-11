<template>
    <div>
        <div class="row" v-if="!artefacts"><div class="col ml-auto"><Waiting></Waiting></div></div>
        <div v-if="artefacts">
            <div class="row"><div class="col">
                <small>{{ $t('home.artefacts') }}: {{ artefacts.length }}</small>
            </div></div>
            <ul class="list-unstyled row mt-2"  v-if="artefacts.length">
                <li class="col-sm-6 col-md-4 col-xl-2 list-item"
                    v-for="art in artefacts"
                    :key="art.id">
                    <artefact-canvas :artefact="art"></artefact-canvas>
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
import ArtefactCanvas from '../../artefactEditor/ArtefactCanvas.vue';

export default Vue.extend({
    data() {
        return {
            editionService: new EditionService(),
        };
    },
    components: {
        ArtefactCanvas,
        Waiting,
    },
    computed: {
        artefacts(): Artefact[] | undefined {
            return this.$state.artefacts.items;
        }
    },
    mounted() {
        this.editionService.fetchArtefacts();
    }
});
</script>