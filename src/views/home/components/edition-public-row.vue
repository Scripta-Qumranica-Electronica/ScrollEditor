<template>
    <b-row>
        <b-col class="col-3" v-for="edition in rowEditions" :key="edition.id">
            <b-card class="p-3" no-body>
                <edition-public-card
                    @edition-copy-click="editionCopyClick(edition)"
                    :edition="edition"
                ></edition-public-card>
            </b-card>
        </b-col>
    </b-row>
</template>
<script lang="ts">
import { EditionInfo } from '@/models/edition';
import { Component, Emit, Prop, Vue } from 'vue-property-decorator';
import EditionPublicCard from './edition-public-card.vue';

@Component({
    name: 'edition-public-row',
    components: {
        EditionPublicCard,
    },
})
export default class EditionPublicRow extends Vue {
    @Prop() public editions!: EditionInfo[];
    @Prop() public index!: number;

    protected get rowEditions() {
        return this.editions.slice(this.index, this.index + 4);
    }

    protected editionCopyClick(edition: EditionInfo) {
        this.$state.editions.current = edition;
        this.$root.$bvModal.show('copy-edition-modal');
        // this.$root.$emit('bv::show::modal', 'copy-edition-modal');
    }
}
</script>

<style lang="scss">
.stylebottom {
    margin-bottom: 50px !important;
}
</style>