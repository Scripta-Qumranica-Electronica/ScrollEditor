<template>
    <div v-if="textFragments">
        <p v-b-toggle.text-fragment-results-main  role="tab">
             <i class="toggle-icon fa fa-angle-down"/> {{ title }} </p>
        <b-collapse  id="text-fragment-results-main" class="mt-2 scroll-bar"
        accordion="search-accordion" role="tabpanel">
            <div>
                <b-card
                    class="p-3"
                    no-body
                    v-for="tf in textFragments"
                    :key="tf.id"
                >
                    <router-link :to="{ path: `/editions/${tf.editionId}/text-fragments/${tf.id}`}">
                        {{ tf.name }} in {{ tf.editionName }}
                    </router-link>
                </b-card>
            </div>
        </b-collapse>
    </div>
</template>
<script lang="ts">
import { ArtefactDTO, DetailedSearchRequestDTO, ImageSearchResponseDTO, TextFragmentSearchResponseDTO } from '@/dtos/sqe-dtos';
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
    name: 'text-fragment-results',
})
export default class TextFragmentResultComponent extends Vue {
    @Prop( { default: null })
    private textFragments!: TextFragmentSearchResponseDTO[] | null;

    private get title() {
        return `Text Fragments (${this.textFragments?.length || 0})`;
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

#text-fragment-results-main .card {
    display: inline-block;
    width: calc(20% - 20px);
    margin: 10px;
}

</style>
