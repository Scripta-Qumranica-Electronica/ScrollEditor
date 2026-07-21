<template>
    <b-modal
        v-if="edition"
        id="editionCopyrightInfoModal"
        ref="editionCopyrightInfoModalRef"
        header-class="header"
        hide-footer
        :title="'Copyright Informations for Edition ' + edition.name"
        size="lg">
        <div class="background">
            <span class="no-copyright" v-if="!edition.copyright">No Additional Information</span>
            <span v-if="edition.copyright">{{edition.copyright}}</span>
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
        return 'WRONG FILTER'; // If you see this in the metadata, you know the function is called when it shouldn't.
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

</style>
