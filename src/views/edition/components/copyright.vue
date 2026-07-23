<template>
    <b-modal lazy
        v-if="edition"
        v-model="visible"
        id="editionCopyrightInfoModal"
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
import { Component, Vue, toNative } from 'vue-facing-decorator';
import { registerModalListener } from '@/utils/modal-bus';
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
    private disposeModalListener?: () => void;

    public get edition() {
        return this.$state.editions.current!;
    }

    public async mounted() {
        this.disposeModalListener = registerModalListener(
            'editionCopyrightInfoModal',
            () => { this.visible = true; },
            () => { this.visible = false; },
        );
        this.editionId = parseInt(String(this.$route.params.editionId), 10);
        if (isNaN(this.editionId)) {
            return;
        }
        await this.$state.prepare.edition(this.editionId);
    }

    public beforeUnmount() {
        this.disposeModalListener?.();
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

</style>
