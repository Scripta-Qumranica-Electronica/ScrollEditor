<template>
    <div v-if="artefacts" class="scroll-bar" id="artefact-editions">
        <p v-b-toggle="title">
             {{ title }} <i class="toggle-icon fa fa-angle-up"/></p>
        <b-collapse visible :id="title" class="mt-2">
            <div>
                <b-card
                    class="p-3"
                    no-body
                    v-for="artefact in artefacts"
                    :key="artefact.id"
                >
                    {{ artefact.id }}
                </b-card>
            </div>
        </b-collapse>
    </div>
</template>
<script lang="ts">
import { ArtefactDTO, DetailedSearchRequestDTO } from '@/dtos/sqe-dtos';
import { EditionInfo } from '@/models/edition';
import SearchService from '@/services/search';
import { Component, Emit, Prop, Vue } from 'vue-property-decorator';
import EditionList from '../home/components/EditionList.vue';
import { SearchFormData, SearchResults } from './types';

@Component({
    name: 'artefact-results',
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

    private get title() {
        return `Artefacts (${this.artefacts?.length || 0})`;
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
.artefact-editions {
    padding-top: 70px;
}
.scroll-bar {
    overflow-y: auto;
    max-height: calc(400px);
}
</style>
