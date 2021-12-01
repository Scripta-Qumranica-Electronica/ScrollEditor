<template>
    <toolbox>
        <b-button
            v-if="!variantEditions.length"
            variant="outline-secondary"
            @click="openCopyEdtion()"
        >
            {{ $t('misc.copy') }}
        </b-button>
        <b-dropdown
            :text="$t('misc.copy')"
            v-if="variantEditions.length"
        >
            <b-dropdown-item-button
                :key="edition.id"
                v-for="edition in variantEditions"
            >
                <router-link
                    :to="{ path: `/editions/${edition.id}/artefacts` }"
                >
                    {{ edition.name }}
                </router-link>
            </b-dropdown-item-button>
            <b-dropdown-divider></b-dropdown-divider>
            <b-dropdown-item-button @click="openCopyEdtion()">{{
                $t('misc.anotherCopy')
            }}</b-dropdown-item-button>
        </b-dropdown>
        <copy-edition-modal></copy-edition-modal>
    </toolbox>
</template>
<script lang="ts">
import { EditionInfo } from '@/models/edition';
import EditionService from '@/services/edition';
import CopyEditionModal from '@/views/home/components/copy-edition-modal.vue';
import { Component, Prop, Vue } from 'vue-property-decorator';
import Toolbox from './toolbox.vue';

@Component({
    name: 'copy-edition-toolbox',
    components: {
        'copy-edition-modal': CopyEditionModal,
        toolbox: Toolbox,
    },
})
export default class CopyEditionToolbox extends Vue {
    public editionService: EditionService = new EditionService();
    public variantEditions: EditionInfo[] = [];

    private get currentEdition(): EditionInfo | null {
        return this.$state.editions.current;
    }

    private openCopyEdtion() {
        this.$root.$emit('bv::show::modal', 'copy-edition-modal');
    }

    private async mounted() {
        if (this.currentEdition) {
            const variantEditionList =
                await this.editionService.getManuscriptEditions(
                    this.currentEdition.manuscriptId
                );
            this.variantEditions = variantEditionList.editions
                .flatMap((x) => x[0])
                .filter((e) => e && !e.isPublic && e.id !== this.currentEdition?.id)
                .map((e) => new EditionInfo(e));
        }
    }
}
</script>
<style lang="scss" scoped>
@import '@/assets/styles/_variables.scss';
</style>
