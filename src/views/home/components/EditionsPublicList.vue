<template>
    <div>
        <div
            v-if="editions.length"
            :class="{afterlogin: this.editions.length > 0 }"
            >
            <b-card
                class="p-3"
                 no-body
                v-for="edition in editions"
                :key="edition.versionId"
            >
                <edition-public-card @edition-copy-click="openCopyEditionModal(edition)" :edition="edition"></edition-public-card>
            </b-card>
        </div>
        <copy-edition-modal />
    </div>
</template>       

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import { EditionInfo } from '@/models/edition';
import EditionIcons from '@/components/cues/edition-icons.vue';
import Waiting from '@/components/misc/Waiting.vue';
import EditionPublicCard from './EditionPublicCard.vue';
import CopyEditionModal from './CopyEditionModal.vue';

@Component({
    name: 'editions-public-list',
    components: {
        Waiting,
        EditionPublicCard,
        CopyEditionModal
     },
})
export default class EditionsPublicList extends Vue {
    @Prop( ) public editions!: EditionInfo[];

    private openCopyEditionModal(edition: EditionInfo) {
            // console.log(edition);
        this.$state.editions.current = edition;
        this.$root.$emit('bv::show::modal', 'copy-edition-modal');
    }
}
</script>

<style  lang="scss" scoped>
@import '@/assets/styles/_variables.scss';
@import '@/assets/styles/_fonts.scss';

.text-edition .card {
    display: inline-block;
    width: calc(25% - 20px);
    margin: 10px;
}

</style>
