<template>
    <div>
        <div
            v-if="editions.length"
            :class="{afterlogin: this.editions.length > 0 }"
            >
            <edition-public-row
                @edition-copy-click="openCopyEditionModal(edition)"
                :editions="editions" 
                v-for="index in indices"
                :key="index"
                :index="index" />

<!--            <b-card
                class="p-3"
                no-body
                v-for="edition in editions"
                :key="edition.id"
            >
                <edition-public-card @edition-copy-click="openCopyEditionModal(edition)" :edition="edition"></edition-public-card>
            </b-card> -->
        </div>
        <copy-edition-modal :visible="true" />
    </div>
</template>       

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import { EditionInfo } from '@/models/edition';
import CopyEditionModal from './copy-edition-modal.vue';
import EditionPublicRow from './edition-public-row.vue';

@Component({
    name: 'editions-public-list',
    components: {
        EditionPublicRow,
        CopyEditionModal,
     },
})
export default class EditionsPublicList extends Vue {
    @Prop( ) public editions!: EditionInfo[];

    protected get indices() {
        const indices: number[] = [];
        for (let idx = 0; idx < this.editions.length; idx += 4) {
            indices.push(idx);
        }

        return indices;
    }

    protected openCopyEditionModal(edition: EditionInfo) {
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
