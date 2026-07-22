<template>
    <b-modal
        v-if="edition && metadata"
        v-model="visible"
        id="editionMetadataModal"
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
                        cleanString(metadata[key] || '-')
                    }}</span>
                </li>
                <li class="row m-2">
                    <span class="key col-2">Copyright:</span>
                    <span class="value col">{{edition.copyright}}</span>
                </li>
            </ul>
        </div>
    </b-modal>
</template>

<script lang="ts">
import { Component, Vue, toNative } from 'vue-facing-decorator';
import Waiting from '@/components/misc/Waiting.vue';
@Component({
    name: 'edition-metadata-modal',
    components: {
        Waiting,
    },
})
class EditionMetadataModal extends Vue {
    public editionId: number = 0;
    public visible: boolean = false;

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
        'publication'
            ];
    public static _headers = {
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
        copyright: 'Copyright',
    };

    // Return the following as 'any' so that eslint doesn't complain about headers[key] above
    public get headers(): any {
        return EditionMetadataModal._headers;
    }
    public get metadata(): any {
        return this.edition.metadata;
    }

    public async mounted() {
        this.editionId = parseInt(String(this.$route.params.editionId), 10);
        if (isNaN(this.editionId)) {
            return;
        }
        await this.$state.prepare.edition(this.editionId);
    }

    public show() {
        this.visible = true;
    }

    public cleanString(value: string): string {
        return value.replace(/\$/g, '');
    }
}
export default toNative(EditionMetadataModal);
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
