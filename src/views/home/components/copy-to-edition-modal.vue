<template>
    <b-modal
        :title="'Copy artefact to edition ' + editionTargetName"
        id="copy-to-edition-modal"
        v-model="internalVisible"
        @show="editionTargetName = ''; editionTargetId = 0"
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
import { Component, Prop, Vue, Watch, toNative } from 'vue-facing-decorator';
import type { BvTriggerableEvent } from 'bootstrap-vue-next';

@Component({
    name: 'copy-to-edition-modal',
})
class CopyToEditionModal extends Vue {
    @Prop() public modelValue!: boolean;

    public searchValue = '';
    public editionTargetId: number = 0;
    public editionTargetName: string = '';
    public errorMessage: string = '';
    public waiting: boolean = false;
    public filteredEditions: EditionInfo[] = [];
    public artefactService: ArtefactService = new ArtefactService();
    public internalVisible: boolean = false;

    @Watch('modelValue')
    onModelValueChanged(val: boolean) {
        this.internalVisible = val;
    }

    @Watch('internalVisible')
    onInternalVisibleChanged(val: boolean) {
        this.$emit('update:modelValue', val);
    }

    public get editions() {
        this.filteredEditions = this.$state.editions.items;
        return this.filteredEditions
            .filter((ed) => !ed.isPublic)
            .filter((x: EditionInfo) =>
                x.name.toLowerCase().includes(this.searchValue.toLowerCase())
            );
    }

    public get currentArtefact(): Artefact {
        return this.$state.artefacts.current!;
    }

    public get imagedObject(): ImagedObject | null {
        return this.$state.imagedObjects.current;
    }

    public async copyToEdition() {
        this.waiting = true;
        this.errorMessage = '';

        try {
            const artefactCopy = await this.artefactService.copyArtefact(
                this.editionTargetId,
                this.currentArtefact
                );

            this.internalVisible = false;

            this.$router.push({
                path: `/editions/${this.editionTargetId}/artefacts/${artefactCopy.id}`,
            });

            this.$router.go(0);
        } catch (err: any) {
            this.errorMessage = err.toString();
            console.error('Error copying artefact', err);
        } finally {
            this.waiting = false;
        }
    }

    public onHide(evt: Event | BvTriggerableEvent) {
        this.internalVisible = false;
    }
}
export default toNative(CopyToEditionModal);
</script>
