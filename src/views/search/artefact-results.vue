<template>
    <div v-if="artefacts" class="artefact-results">
        <p v-b-toggle="artefact-results">
             {{ title }} <i class="toggle-icon fa fa-angle-up"/></p>
        <b-collapse visible id="artefact-results" class="mt-2 scroll-bar">
            <div>
                <b-card
                    class="p-3"
                    no-body
                    v-for="a_e in artefactsWithEditions"
                    :key="a_e.artefact.id"
                >
                    <router-link :to="{path: `/editions/${a_e.edition.id}/artefacts/${a_e.artefact.id}`}">
                        <artefact-image
                            class="card-img-top"
                            :artefact="a_e.artefact"
                            maxWidth="150"
                        ></artefact-image>
                        <label class="side-edition">
                            {{ a_e.edition.name }} - {{ a_e.artefact.name }} - {{ a_e.artefact.side }}
                        </label>
                    </router-link>
                    
                </b-card>
            </div>
        </b-collapse>
    </div>
</template>
<script lang="ts">
import ArtefactImage from '@/components/artefact/artefact-image.vue';
import { ArtefactDTO, DetailedSearchRequestDTO } from '@/dtos/sqe-dtos';
import { Artefact } from '@/models/artefact';
import { EditionInfo } from '@/models/edition';
import { ImagedObject } from '@/models/imaged-object';
import SearchService from '@/services/search';
import { Component, Emit, Prop, Vue } from 'vue-property-decorator';
import EditionList from '../home/components/EditionList.vue';
import { SearchFormData, SearchResults } from './types';

interface ArtefactWithEdition {
    artefact: Artefact;
    edition: EditionInfo;
}

@Component({
    name: 'artefact-results',
    components: {
        'artefact-image': ArtefactImage,
    }
})
export default class ArtefactResultComponent extends Vue {
    @Prop( { default: null })
    private artefacts!: ArtefactDTO[] | null;
    private ready = false;

    private async mounted() {
        this.ready = false;
        await this.$state.prepare.allEditions();
        this.ready = true;
    }

    private get artefactsWithEditions() {
        const artefacts: ArtefactWithEdition[] = [];

        if (!this.artefacts) {
            return artefacts;
        }

        for (const dto of this.artefacts) {
            const edition = this.$state.editions.find(dto.editionId);
            if (edition) {
                const artefact = new Artefact(dto);
                artefacts.push( { artefact, edition });
            }
        }

        return artefacts;
    }

    private get title() {
        return `Artefacts (${this.artefactsWithEditions.length || 0})`;
    }
}
</script>

<style lang="scss" scoped>
@import '@/assets/styles/_variables.scss';
@import '@/assets/styles/_fonts.scss';

.direction {
    float: right;
}
.text-color {
    color: $black;
}
.text-edition {
    font-style: $font-style;
    font-weight: $font-weight-1;
    font-size: $font-size-3;
    font-family: $font-family;
}

.scroll-bar {
    overflow-y: auto;
    max-height: calc(400px);
}

.artefact-results {
    margin-top: 50px;
}

#artefact-results .card {
    display: inline-block;
    width: calc(25% - 20px);
    margin: 10px;
}
</style>
