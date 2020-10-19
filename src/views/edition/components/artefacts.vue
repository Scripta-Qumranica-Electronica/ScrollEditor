<template>
    <div>
        <div class="header">
            <b-row>
                <b-col class="mb-3">
                    <search-bar
                        class="direction"
                        :params="searchBarParams"
                        @on-search="onArtefactsSearch($event)"
                    ></search-bar>
                </b-col>
            </b-row>
        </div>
        <div style="max-height: calc(100vh - 80px); overflow-y: auto; height: 60vh">
            <div
                class="card"
                v-for="artefact in filteredArtefacts"
                :key="artefact.versionId"
            >
                <artefact-card :artefact="artefact"></artefact-card>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import { EditionInfo } from '@/models/edition';
import EditionIcons from '@/components/cues/edition-icons.vue';
import Waiting from '@/components/misc/Waiting.vue';
import EditionCard from './EditionCard.vue';
import ArtefactCard from './artefact-card.vue';
import { Artefact } from '@/models/artefact';
import SearchBar from '@/components/search-bar.vue';
import { SearchBarParams, SearchBarValue } from '@/components/search-bar.vue';

@Component({
    name: 'edition-artefacts',
    components: {
        Waiting,
        ArtefactCard,
        SearchBar,
    },
})
export default class EditionArtefacts extends Vue {
    private filteredArtefacts: Artefact[] = [];
    private searchValue: SearchBarValue = {};
    private editionId: number = 0;
    private searchBarParams: SearchBarParams = {
        filter: true,
        sort: true,
        view: true,
    };

    public getFilteredArtefacts(): Artefact[] {
        return this.$state.artefacts.items
            .filter((art: Artefact) => {
                let filter = true;
                if (this.searchValue.view && this.searchValue.view !== 'recto and verso') {
                    filter = filter && art.side === this.searchValue.view;
                }
                if (this.searchValue.filter) {
                    filter =
                        filter &&
                        art.name
                            .toLowerCase()
                            .includes(this.searchValue.filter.toLowerCase());
                }
                return filter;
            })
            .sort((a, b) => {
                if (this.searchValue.sort) {
                    return a[this.searchValue.sort] > b[this.searchValue.sort]
                        ? 1
                        : -1;
                } else {
                    return 1;
                }
            });
    }

    protected async mounted() {
        this.editionId = parseInt(this.$route.params.editionId, 10);
        await this.$state.prepare.artefacts(this.editionId);
        this.filteredArtefacts = this.getFilteredArtefacts();
    }

    public onArtefactsSearch(searchEvent: SearchBarValue) {
        this.searchValue = searchEvent;
        this.filteredArtefacts = this.getFilteredArtefacts();
    }
}
</script>
<style scoped>
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
