<template>
    <div>
        <artefact-side-menu></artefact-side-menu>
        <artefact-image class="card-img-top" v-if="artefact" :artefact="artefact" :scale="0.5"></artefact-image>
    </div>
</template>

<script lang="ts">
import Vue, { PropOptions } from 'vue';
import ArtefactImage from './artefact-image.vue';
import { Artefact } from '../../models/artefact';
import EditionService from '../../services/edition';
import ArtefactService from '../../services/artefact';
import ArtefactSideMenu from './ArtefactSideMenu.vue';

export default Vue.extend({
    name: 'artefact-editor',
    components: {
        ArtefactImage,
        ArtefactSideMenu,
    },
    props: {
    },
    data() {
        return {
            errorMessage: '',
            waiting: true,
            editionService: new EditionService(),
            artefactService: new ArtefactService(),
        };
    },
    computed: {
        artefact(): Artefact | undefined {
            return this.$state.artefacts.current;
        },
        editionId(): number {
            return parseInt(this.$route.params.editionId);
        },
    },
    async mounted() {
        try {
            this.waiting = true;
            await this.editionService.fetchEdition(this.editionId);
            await this.artefactService.fetchArtefactInfo(
                this.editionId,
                parseInt(this.$route.params.artefactId)
            );
        } catch {
            console.error('Error in artefact editor');
        } finally {
        this.waiting = false;
        }
    },
    methods: {
        copy() {
            console.log("copy")
        }
    },
});
</script>

<style lang="scss" scoped>
ul {
    list-style-type: none;
    padding: 0px;
}
</style>
