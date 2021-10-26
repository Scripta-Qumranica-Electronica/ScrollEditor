<template>
    <div class="background">
        <div class="header">
            Additional Information for Edition {{ edition.name }}
        </div>
        <span class="no-metadata" v-if="!metadata"
            >No Additional Information</span
        >
        <ul v-if="metadata" class="metadata">
            <li class="row m-2" v-for="key in keys" :key="key">
                <span class="key col-2">{{ headers[key] }}:</span>
                <span class="value col">{{ metadata[key] || 'N/A' }}</span>
            </li>
        </ul>
    </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import Waiting from '@/components/misc/Waiting.vue';

@Component({
    name: 'edition-artefacts',
    components: {
        Waiting,
    },
})
export default class EditionMetadata extends Vue {
    public editionId: number = 0;

    protected get edition() {
        return this.$state.editions.current!;
    }

    protected get metadata() {
        return this.edition.metadata;
    }

    protected keys = [
        'material',
        'publicationNumber',
        'publication',
        'plate',
        'frag',
        'site',
        'period',
        'composition',
        'copy',
        'manuscript',
        'otherIdentifications',
        'abbreviation',
        'manuscriptType',
        'compositionType',
        'language',
        'script',
    ];
    protected headers = {
        material: 'Material',
        publicationNumber: 'Publication Number',
        publication: 'Publication',
        plate: 'Plate',
        frag: 'Fragment',
        site: 'Site',
        period: 'Period',
        composition: 'Composition',
        copy: 'Copy',
        manuscript: 'Manuscript',
        otherIdentifications: 'Other Identifications',
        abbreviation: 'Abbreviation',
        manuscriptType: 'Manuscript Type',
        compositionType: 'Composition Type',
        language: 'Language',
        script: 'Script',
    };

    protected async mounted() {
        this.editionId = parseInt(this.$route.params.editionId, 10);
        await this.$state.prepare.edition(this.editionId);
    }
}
</script>
<style lang="scss" scoped>
.background {
    background: white;
    margin-top: 20px;
    padding-bottom: 1px;
}
.header {
    text-align: center;
    padding: 16px 16px;
    font-size: 18px;
}
.metadata {
    list-style: none;
    padding-left: 15px;
    padding-right: 15px;
}
li.row.m-2 {
    border-bottom: solid 1px #d9d3d3;
    line-height: 27px;
}
span.key.col-2 {
    font-weight: bold;
}
</style>
