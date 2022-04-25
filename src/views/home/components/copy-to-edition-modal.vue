<template>
    <b-modal
        :title="'Copy artefact to edition ' + editionTargetName"
        id="copy-to-edition-modal"
        @show="editionTargetName = ''; editionTargetId = 0"
        ref="copyToEditionModalRef"
        footer-class="title-footer"
        @ok="copyToEdition"
        @hide="onHide"
    >
        <form>
            <b-row>
                <b-col cols="12">
                    <b-dropdown :text="editionTargetName || 'Select edition'" class="w-100">
                        <b-dropdown-form>
                            <b-form-input
                                v-model="searchValue"
                                id="dropdown-form-email"
                                size="sm"
                            ></b-form-input>
                            <b-dropdown-item
                                v-for="edition in editions"
                                :key="edition.id"
                                 @click="editionTargetName = edition.name; editionTargetId = edition.id"
                                >{{ edition.name }}</b-dropdown-item
                            >
                        </b-dropdown-form>
                    </b-dropdown>
                </b-col>
            </b-row>
        </form>
        <template v-slot:modal-footer>
            <b-row>
                <b-col>
                    <b-button @click.once="copyToEdition" :disabled="!editionTargetId">
                        {{ $t('misc.copyToEdition') }}
                    </b-button>
                </b-col>
            </b-row>
        </template>
    </b-modal>
</template>
<script lang="ts">
import { Artefact } from '@/models/artefact';
import { EditionInfo } from '@/models/edition';
import { ImagedObject } from '@/models/imaged-object';
import ArtefactService from '@/services/artefact';
import { Component, Prop, Vue } from 'vue-property-decorator';

@Component({
    name: 'copy-to-edition-modal',
})
export default class CopyToEditionModal extends Vue {
    public searchValue = '';
    public editionTargetId: number = 0;
    public editionTargetName: string = '';
    private errorMessage: string = '';
    private waiting: boolean = false;
    private filteredEditions: EditionInfo[] = [];
    private artefactService: ArtefactService = new ArtefactService();
    public get editions() {
        this.filteredEditions = this.$state.editions.items;
        return this.filteredEditions
            .filter((ed) => !ed.isPublic)
            .filter((x: EditionInfo) =>
                x.name.toLowerCase().includes(this.searchValue.toLowerCase())
            );
    }

    private get currentArtefact(): Artefact | null {
        return this.$state.artefacts.current;
    }

    private get imagedObject(): ImagedObject | null {
        return this.$state.imagedObjects.current;
    }

    private async copyToEdition() {
        this.waiting = true;
        this.errorMessage = '';

        try {
            // editionId: number, imagedObject: ImagedObject, artefactName: string, side: Side
            const artefactCopy = await this.artefactService.createArtefact(
                this.editionTargetId,
                this.imagedObject!,
                this.currentArtefact?.name!,
                this.currentArtefact?.side!
                );

            // this.$state.artefacts.current = artefactCopy;

            // this.$state.misc.newEditionId = newEdition.id;

            (this.$refs.copyToEditionModalRef as any).hide();

            this.$router.push({
                path: `/editions/${this.editionTargetId}/artefacts/${artefactCopy.id}`,
            });

            // this.$router.go(0);
        } catch (err: any) {
            this.errorMessage = err.toString();
            console.error('Error copying artefact', err);
        } finally {
            this.waiting = false;
        }
    }
    private onHide(evt: Event) {
        (this.$refs.copyToEditionModalRef as any).blur();
        (this.$refs.copyToEditionModalRef as any).hide();
    }
}
</script>