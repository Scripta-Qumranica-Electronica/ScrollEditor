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
import { Component, Emit, Prop, Vue, toNative } from 'vue-facing-decorator';
import EditionPublicCard from './edition-public-card.vue';

@Component({
    name: 'edition-public-row',
    components: {
        EditionPublicCard,
    },
})
class EditionPublicRow extends Vue {
    @Prop() public editions!: EditionInfo[];
    @Prop() public index!: number;

    public get rowEditions() {
        return this.editions.slice(this.index, this.index + 4);
    }

    @Emit('show-copy-modal')
    public editionCopyClick(edition: EditionInfo) {
        this.$state.editions.current = edition;
        // Vue 3: $root.$bvModal is gone; emit upward so public-editions can
        // toggle the copy modal's v-model.
        return edition;
    }
}
export default toNative(EditionPublicRow);
</script>

<style lang="scss">
.stylebottom {
    margin-bottom: 50px !important;
}
</style>
