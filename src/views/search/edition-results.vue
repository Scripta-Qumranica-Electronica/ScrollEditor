<template>
    <div v-if="editions && ready" class="scroll-bar">
        <p v-b-toggle.edition-results-main>
            <i class="toggle-icon fa fa-angle-down"/> {{ title }}</p>
        <b-collapse visible id="edition-results-main" class="mt-2">
            <div>
                <b-card
                    class="p-3"
                    no-body
                    v-for="edition in actualEditions"
                    :key="edition.versionId"
                >
                    <edition-card :edition="edition"></edition-card>
                </b-card>
            </div>
        </b-collapse>
    </div>
</template>
<script lang="ts">
import { DetailedSearchRequestDTO, EditionDTO } from '@/dtos/sqe-dtos';
import { EditionInfo } from '@/models/edition';
import SearchService from '@/services/search';
import { Component, Emit, Prop, Vue } from 'vue-property-decorator';
import EditionCard from '../home/components/EditionCard.vue';
import EditionList from '../home/components/EditionList.vue';
import { SearchFormData, SearchResults } from './types';

@Component({
    name: 'edition-results',
    components: {
        'edition-card': EditionCard
    }
})
export default class EditionResultsComponent extends Vue {
    @Prop( { default: null })
    private editions!: EditionDTO[] | null;
    private ready = false;

    private async mounted() {
        this.ready = false;
        await this.$state.prepare.allEditions();
        this.ready = true;
    }

    private get actualEditions(): EditionInfo[] {
        // From EditionDTO to EditionInfo - we have the editions in our store
        if (!this.editions) {
            return [];
        }

        return this.editions.map(ed => this.$state.editions.find(ed.id)).filter(ed => !!ed) as EditionInfo[];
    }

    private get title() {
        return `Editions (${this.actualEditions.length || 0})`;
    }
}
</script>

<style lang="scss" scoped>
@import '@/assets/styles/_variables.scss';
@import '@/assets/styles/_fonts.scss';

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

p {
    font-style: $font-style;
    font-weight: $font-weight-1;
    font-size: $font-size-3;
    font-family: $font-family;
}

.scroll-bar {
    overflow-y: auto;
    max-height: calc(400px);
}

#edition-results-main .card {
    display: inline-block;
    width: calc(25% - 20px);
    margin: 10px;
}
</style>
