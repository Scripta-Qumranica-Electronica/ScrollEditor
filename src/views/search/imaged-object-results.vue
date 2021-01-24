<template>
    <div v-if="imagedObjects">
        <p v-b-toggle.imaged-object-results-main role="tab">
             <i class="toggle-icon fa fa-angle-down"/> {{ title }} </p>
        <b-collapse  id="imaged-object-results-main" class="mt-2 scroll-bar"
        accordion="search-accordion" role="tabpanel">
            <div>
                <b-card
                    class="p-3"
                    no-body
                    v-for="im in expandedObjects"
                    :key="im.id"
                >
                    <div class="row">
                        <div class="col-4">
                            <span class="image-id">{{ im.id }}</span>
                            <span class="in" v-if="im.editions">in</span>
                            <span class="edition" v-for="edition in im.editions" :key="edition.id">
                                <router-link :to="{path: `/editions/${edition.id}/imaged-objects/${im.id}`}">
                                    {{ edition.name }}
                                </router-link>
                            </span>
                        </div>
                        <div class="col-8">
                            <img class="card-img" v-lazy="im.rectoThumbnail || im.versoThumbnail" v-if="im.rectoThumbnail || im.versoThumbnail" alt="Imaged-Object">
                        </div>
                    </div>
                </b-card>
            </div>
        </b-collapse>
    </div>
</template>
<script lang="ts">
import { ArtefactDTO, DetailedSearchRequestDTO, ImageSearchResponseDTO } from '@/dtos/sqe-dtos';
import { Artefact } from '@/models/artefact';
import { EditionInfo } from '@/models/edition';
import { ImagedObject } from '@/models/imaged-object';
import SearchService from '@/services/search';
import { Component, Emit, Prop, Vue } from 'vue-property-decorator';
import EditionList from '../home/components/EditionList.vue';
import { SearchFormData, SearchResults } from './types';

interface ExpandedImagedObjectResponse extends ImageSearchResponseDTO {
    editions: EditionInfo[] | null;
}

@Component({
    name: 'imaged-object-results',
})
export default class ImagedObjectResultComponent extends Vue {
    @Prop( { default: null })
    private imagedObjects!: ImageSearchResponseDTO[] | null;
    private get expandedObjects() {
        const expanded = [] as ExpandedImagedObjectResponse[];

        for (const im of this.imagedObjects || []) {
            let editions: EditionInfo[] | null = null;
            if (im.editionIds) {
                for (const editionId of im.editionIds) {
                    const edition = this.$state.editions.find(editionId);
                    if (!edition) {
                        console.warn(`Can't locate edition ${editionId} returned by search`);
                    } else {
                        if (!editions) {
                            editions = [];
                        }
                        editions.push(edition);
                    }
                }
            }
            expanded.push({ editions, ...im});
        }

        return expanded;
    }
    private ready = false;

    private async mounted() {
        this.ready = false;
        await this.$state.prepare.allEditions();
        this.ready = true;
    }

    private get title() {
        return `Imaged Objects (${this.imagedObjects?.length || 0})`;
    }
}
</script>

<style lang="scss" scoped>
@import '@/assets/styles/_variables.scss';
@import '@/assets/styles/_fonts.scss';

span p {
    font-style: $font-style;
    font-weight: $font-weight-1;
    font-size: $font-size-3;
    font-family: $font-family;
}

.scroll-bar {
    overflow-y: auto;
    max-height: calc(380px);
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

#imaged-object-results-main .card {
    display: inline-block;
    width: calc(33% - 20px);
    margin: 10px;
}

.in {
    margin-left: 5px;
    font-size: 90%;
}
</style>
