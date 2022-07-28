<template>
    <div>
        <div class="header">
            <b-row>
                <b-col class="mb-3">
                    <search-bar
                        class="direction"
                        :params="searchBarParams"
                        :value="searchValue"
                        @search="onArtefactsSearch($event)"
                    ></search-bar>
                </b-col>
            </b-row>
        </div>
        <div class="scroll-bar" ref="container">
            <div
                class="card"
                v-for="artefact in sortedFragments"
                :key="artefact.id"
            >
                <artefact-card :artefact="artefact"></artefact-card>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import Waiting from '@/components/misc/Waiting.vue';
import ArtefactCard from './artefact-card.vue';
import { Artefact } from '@/models/artefact';
import SearchBar from '@/components/search-bar.vue';
import { SearchBarParams } from '@/components/search-bar.vue';
import { SearchBarValue } from '@/state/utilities';

@Component({
    name: 'edition-artefacts',
    components: {
        Waiting,
        ArtefactCard,
        SearchBar,
    },
})
export default class EditionArtefacts extends Vue {
    public filteredArtefacts: Artefact[] = [];
    public searchValue: SearchBarValue = { side: 'recto and verso'};
    public editionId: number = 0;
    public searchBarParams: SearchBarParams = {
        filter: true,
        sort: false,
        side: true,
    };

    private get sortedFragments(): Artefact[] {
        return this.filteredArtefacts.sort( (a: Artefact, b: Artefact) => {
                        return (a as any).name.localeCompare( (b as any).name,  undefined,
                        {
                            numeric: true,
                            sensitivity: 'base'
                        });
                    });
    }

    public getFilteredArtefacts(): Artefact[] {
        return this.$state.artefacts.items
            .filter((art: Artefact) => {
                let filter = true;

                if (art.isVirtual) {
                    return false;
                }

                if (
                    this.searchValue.side &&
                    this.searchValue.side !== 'recto and verso'
                ) {
                    filter = filter && art.side === this.searchValue.side;
                }
                if (
                    this.searchValue.filter
                    ) {
                    filter =
                        filter &&
                        `${art.name} - ${art.side}`
                            .toLowerCase()
                            .includes(this.searchValue.filter.toLowerCase());
                }

                return filter;
            })
            .sort((a: Artefact, b: Artefact) => {
                if (this.searchValue.sort) {
                    return (a as any)[this.searchValue.sort] >
                        (b as any)[this.searchValue.sort]
                        ? 1
                        : -1;
                } else {
                    return 1;
                }
            });
    }

    public onArtefactsSearch(searchEvent: SearchBarValue) {
        this.searchValue = searchEvent;
        this.filteredArtefacts = this.getFilteredArtefacts();
    }

    protected async mounted() {
        this.editionId = parseInt(this.$route.params.editionId, 10);
        await this.$state.prepare.edition(this.editionId);
        await this.$state.prepare.artefacts(this.editionId);
        this.filteredArtefacts = this.getFilteredArtefacts();
   }

   private get containerRef() {
       return this.$refs.container as Element;
   }
}

</script>
<style scoped>
.scroll-bar {
    max-height: calc(100vh - 80px);
    overflow-y: auto;
    overflow-x: hidden;
    height: 60vh;
}
.card {
    display: inline-block;
    width: calc(25% - 20px);
    margin: 10px;
}
.direction {
    float: right;
    margin-top: -67px;
}
</style>
