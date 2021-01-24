<template>
    <div v-if="artefacts">
        <p v-b-toggle.artefact-results-main  role="tab">
             <i class="toggle-icon fa fa-angle-down"/> {{ title }} </p>
        <b-collapse  id="artefact-results-main" class="mt-2 scroll-bar"
        accordion="search-accordion" role="tabpanel">
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
                            :imaged-object="a_e.imagedObject"
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
import { ArtefactDTO, DetailedSearchRequestDTO, ExtendedArtefactDTO, ImagedObjectDTO, ImageDTO, ImageStackDTO } from '@/dtos/sqe-dtos';
import { Artefact } from '@/models/artefact';
import { EditionInfo } from '@/models/edition';
import { ImagedObject } from '@/models/imaged-object';
import SearchService from '@/services/search';
import { Component, Emit, Prop, Vue } from 'vue-property-decorator';
import EditionList from '../home/components/EditionList.vue';
import { SearchFormData, SearchResults } from './types';

interface ArtefactWithEdition {
    artefact: Artefact;
    imagedObject?: ImagedObject;
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
    private artefacts!: ExtendedArtefactDTO[] | null;
    private ready = false;

    private async mounted() {
        this.ready = false;
        await this.$state.prepare.allEditions();
        this.ready = true;
    }

    private createImagedObjectDTO(dto: ExtendedArtefactDTO) {
        // Create a DTO for the imaged object.
        // This DTO has a lot of default fields, we only need the id, recto and verso urls and ppi

        if (!dto.url) {
            console.warn('Search result returned an artefact with no image url', dto);
            return undefined;
        }

        // The url from the server is either for recto or verso - depending on the artefact's side.
        // An ImagedObject must have both recto and verso image stacks, so we just replicate the same stack
        // twice.
        const rectoImageDTO: ImageDTO = {
            id: -1,
            url: dto.url,
            lightingType: 'direct',
            lightingDirection: 'top',
            waveLength: [],
            type: 'master',
            side: 'recto',
            ppi: dto.ppi,
            master: true,
            catalogNumber: 0
        };
        const rectoImageStackDTO: ImageStackDTO = {
            id: -1,
            images: [rectoImageDTO],
            masterIndex: 0,
        };

        const versoImageDTO = { ...rectoImageDTO };
        versoImageDTO.side = 'verso';
        const versoImageStackDTO: ImageStackDTO = {
            id: -1,
            images: [versoImageDTO],
            masterIndex: 0,
        };

        const imagedObjectDTO: ImagedObjectDTO = {
            id: dto.imagedObjectId,
            recto: rectoImageStackDTO,
            verso: versoImageStackDTO,
            artefacts: [],
        };

        return imagedObjectDTO;
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
                const imagedObjectDTO = this.createImagedObjectDTO(dto);
                const imagedObject = imagedObjectDTO ? new ImagedObject(imagedObjectDTO, edition) : undefined;
                artefacts.push( { artefact, edition, imagedObject });
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

p {
    font-style: $font-style;
    font-weight: $font-weight-1;
    font-size: $font-size-3;
    font-family: $font-family;
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

.toggle-icon {
    margin-left: 5px;
    color: $blue;
}

p:focus {
    outline: 0;
}

.collapsed .toggle-icon {
    transform: rotate(-90deg);
}

#artefact-results-main .card {
    display: inline-block;
    width: calc(25% - 20px);
    margin: 10px;
}
</style>
