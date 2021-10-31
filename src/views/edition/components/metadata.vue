<template>
    <div class="background" style="min-height: calc(100vh - 56px)">
        <div class="header">
            Additional Information for Edition {{ edition.name }}
        </div>
        <span class="no-metadata" v-if="!metadata"
            >No Additional Information</span
        >
        <ul
            v-if="metadata"
            class="metadata"
            style="
                min-height: calc(100vh - 140px);
                overflow-y: auto;
                overflow-x: hidden;
            "
        >
            <li class="row m-2" v-for="key in keys" :key="key">
                <span class="key col-2">{{ headers[key] }}:</span>
                <span class="value col">{{
                    (metadata[key] || '-') | cleanString
                }}</span>
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
    filters: {
        cleanString(value: string) {
            return value.replace(/\$/g, '');
        },
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
        'manuscript',
        'composition',
        'copy',
        'abbreviation',
        'site',
        'manuscriptType',
        'compositionType',
        'period',
        'language',
        'script',
        'material',
        'otherIdentifications',
        'publication',
    ];
    protected headers = {
        manuscript: 'Manuscript',
        composition: 'Composition',
        copy: 'Copy',
        abbreviation: 'Abbreviation',
        site: 'Site',
        manuscriptType: 'Manuscript Type',
        compositionType: 'Composition Type',
        period: 'Period',
        language: 'Language',
        script: 'Script',
        material: 'Material',
        otherIdentifications: 'Other Identifications',
        publication: 'Publication',
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
