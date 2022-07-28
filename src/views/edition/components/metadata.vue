<template>
    <b-modal
        v-if="edition"
        id="editionMetadataModal"
        ref="editionMetadataModalRef"
        header-class="header"
        hide-footer
        :title="'Additional Information for Edition ' + edition.name"
        size="lg"
    >
        <div class="background">
            <span class="no-metadata" v-if="!metadata"
                >No Additional Information</span
            >
            <ul v-if="metadata" class="metadata">
                <li class="row m-2" v-for="key in keys" :key="key">
                    <span class="key col-2">{{ headers[key] }}:</span>
                    <span class="value col">{{
                        (metadata[key] || '-') | cleanString
                    }}</span>
                </li>
            </ul>
        </div>
    </b-modal>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import Waiting from '@/components/misc/Waiting.vue';
@Component({
    name: 'edition-metadata-modal',
    components: {
        Waiting,
    },
    filters: {
        cleanString(value: string) {
            return value.replace(/\$/g, '');
        },
    },
})
export default class EditionMetadataModal extends Vue {
    public editionId: number = 0;

    public get edition() {
        return this.$state.editions.current!;
    }

    public keys = [
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
    private _headers = {
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

    // Return the following as 'any' so that eslint doesn't complain about headers[key] above
    public get headers(): any {
        return this._headers;
    }
    public get metadata(): any {
        return this.edition.metadata;
    }

    protected async mounted() {
        this.editionId = parseInt(this.$route.params.editionId, 10);
        if (isNaN(this.editionId)) {
            return;
        }
        await this.$state.prepare.edition(this.editionId);
    }

    public cleanString(): any {
        // This is a placeholder to remove the error when calling the cleanString filter.
        // Without this, Typescript complains that cleanString is not defined, even though Vue
        // knows it should call the function defined as the filter.
        // return 'WRONG FILTER'; // If you see this in the metadata, you know the function is called when it shouldn't.
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
