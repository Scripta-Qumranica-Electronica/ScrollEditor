<template>
    <div>
        <b-modal
            :draggable="true"
            id="editVirtualArtefactText"
            title="Edit Reconstructed Text"
            hide-footer
            @shown="onShown"
            @hide="onHide"
            ref="my-modal"
        >
            <b-row>
                <b-col>
                    <div>
                        <b-input
                            type="text"
                            dir="rtl"
                            @input="onTextChanged"
                            v-model.lazy="text"
                            class="w-input"
                            autofocus
                        ></b-input>
                    </div>
                </b-col>
            </b-row>
        </b-modal>
    </div>
</template>

<script lang="ts">
import { Component, Vue, Watch } from 'vue-property-decorator';
import { VirtualArtefactEditor } from '@/services/virtual-artefact';
import { Artefact } from '@/models/artefact';

@Component({
    name: 'edit-virtual-artefact-text-modal',
})
export default class EditVirtualArtefactTextModal extends Vue {
    private text = '';
    private prevText = '';
    private editor?: VirtualArtefactEditor;
    private originalArtefact?: Artefact;

    private onShown() {
        if (!this.$state.textFragmentEditor.editedVirtualArtefact) {
            this.$state.corrupted('EditorVirtualArtefact modal is shown with no edited virtual artefact');
        }
        this.originalArtefact = this.$state.textFragmentEditor.editedVirtualArtefact;

        this.editor = new VirtualArtefactEditor(this.$state.textFragmentEditor.editedVirtualArtefact);

        // Hide our artefact, and show the shadow artefact
        this.originalArtefact.isPlaced = false;
        this.text = this.prevText = this.editor.text;
    }

    private onHide() {
        if (!this.editor) {
            return;
        }

        this.editor.dispose();
        this.editor = undefined;

        this.originalArtefact!.isPlaced = true;
    }

    private onTextChanged() {
        // TODO: Break each change into deleted characters and inserted characters
        console.debug(`Changed ${this.prevText} --> ${this.text}`);
        this.prevText = this.text;
    }
}
</script>

<style lang="scss" scoped>
</style>
