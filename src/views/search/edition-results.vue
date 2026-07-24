<template>
    <div v-if="editions && ready">
        <p v-b-toggle.edition-results-main  role="tab">
            <i class="toggle-icon fa fa-angle-down"/> {{ title }}</p>
        <b-collapse  id="edition-results-main" class="mt-2"
        accordion="search-accordion" role="tabpanel">
            <div>
                <b-card
                    class="p-3"
                    no-body
                    v-for="edition in displayedEditions"
                    :key="edition.id"
                >
                    <edition-card :edition="edition"></edition-card>
                </b-card>
                <p v-if="actualEditions.length > renderLimit" class="more-results">
                    Showing the first {{ renderLimit }} of {{ actualEditions.length }}
                    editions — refine your search to narrow the results.
                </p>
            </div>
        </b-collapse>
    </div>
</template>
<script lang="ts">
import { DetailedSearchRequestDTO, EditionDTO } from '@/dtos/sqe-dtos';
import { EditionInfo } from '@/models/edition';
import SearchService from '@/services/search';
import { Component, Emit, Prop, Vue, toNative } from 'vue-facing-decorator';
import { vBToggle } from 'bootstrap-vue-next';
import EditionCard from '../home/components/edition-card.vue';
import EditionList from '../home/components/edition-list.vue';
import { SearchFormData, SearchResults } from './types';

@Component({
    name: 'edition-results',
    components: {
        'edition-card': EditionCard
    },
    directives: {
        'b-toggle': vBToggle,
    },
})
class EditionResultsComponent extends Vue {
    @Prop( { default: null })
    public editions!: EditionDTO[] | null;
    public ready = false;
    // Cap how many result cards render at once. A loose designation (e.g. "1Q")
    // can match 100 editions; rendering that many <edition-card>s (each with an
    // IntersectionObserver) blocks the initial paint of the results tab. The full
    // count still shows in the tab title; the rest surface once the user refines.
    public readonly renderLimit = 24;

    public async mounted() {
        this.ready = false;
        await this.$state.prepare.allEditions();
        this.ready = true;
    }

    public get actualEditions(): EditionInfo[] {
        // From EditionDTO to EditionInfo - we have the editions in our store
        if (!this.editions) {
            return [];
        }

        return this.editions.map(ed => this.$state.editions.find(ed.id)).filter(ed => !!ed) as EditionInfo[];
    }

    public get displayedEditions(): EditionInfo[] {
        return this.actualEditions.slice(0, this.renderLimit);
    }

    public get title() {
        return `Editions (${this.actualEditions.length || 0})`;
    }
}
export default toNative(EditionResultsComponent);
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

#edition-results-main .card {
    display: inline-block;
    width: calc(25% - 20px);
    margin: 10px;
}

.more-results {
    margin: 10px;
    font-style: italic;
    color: $blue;
}
</style>
