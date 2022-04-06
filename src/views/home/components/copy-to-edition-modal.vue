<template>
    <!-- :visible="currentEdition !== null &&  visible === true" -->
    <b-modal id="copy-to-edition-modal" ref="copyToEditionModalRef">
        <div>
            <b-dropdown text="select edtion">
                <b-form-input
                    v-model="searchValue"
                    id="dropdown-form-email"
                    size="sm"
                ></b-form-input>
                <b-dropdown-item
                    v-for="edition in editions"
                    :key="edition.id"
                    >{{ edition.name }}</b-dropdown-item
                >
            </b-dropdown>
        </div>
    </b-modal>
</template>
<script lang="ts">
import { EditionInfo } from '@/models/edition';
import { Component, Prop, Vue } from 'vue-property-decorator';

@Component({
    name: 'copy-to-edition-modal',
})
export default class CopyToEditionModal extends Vue {
    public searchValue = '';
    private filteredEditions: EditionInfo[] = [];
    public get editions() {
        this.filteredEditions = this.$state.editions.items;
        return this.filteredEditions
            .filter((ed) => !ed.isPublic)
            .filter(
                (x: EditionInfo) =>
                    x.name
                        .toLowerCase()
                        .includes(this.searchValue.toLowerCase())
            );
    }
}
</script>