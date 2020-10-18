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
        <div
            class="card"
            v-for="artefact in artefacts"
            :key="artefact.versionId"
        >
            <artefact-card :artefact="artefact"></artefact-card>
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
        SearchBar
    },
})
export default class EditionArtefacts extends Vue {

    private searchValue: SearchBarValue = {};
    private searchBarParams: SearchBarParams = {
        filter: true,
        sort: true,
        view: true
    };

    public get artefacts(): Artefact[] {
        return this.$state.artefacts.items.filter((art: Artefact) => {
            let filter = true;
            if (this.searchValue.view) {
                filter = filter && art.side === this.searchValue.view
            }
            if (this.searchValue.filter) {
                filter = filter && art.name.toLowerCase().includes(this.searchValue.filter.toLowerCase())
            }
            return filter;
        } )
        .sort(
            (a, b) => {
                if (this.searchValue.sort) {
                    return a[this.searchValue.sort] > b[this.searchValue.sort] ? 1 : -1;
                }
                else {
                    return 1;
                }
            }
        )
        }

    public onArtefactsSearch(searchEvent: SearchBarValue) {
        console.log(searchEvent)
        this.searchValue = searchEvent;
    }

        
}
</script>
<style scoped>
.card{
    display: inline-block;
    width: calc(25% - 20px);
    margin: 10px;
}
.direction{
    float: right;
    margin-top: -67px;
}

</style>
