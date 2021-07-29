<template>
    <div class="border-around">
        <b-row>
            <b-col class="col-10">
                <label for="w-text-input" class="text-bar m-2 ml-3">
                Edit Reconstructed Text
                </label>
            </b-col>
                <b-col class="col-2">
                <b-button @click="onHide()" size="sm"
                    title="Close" aria-label="Close"
                    class="close m-0 mr-1" variant="secondary">
                        <span aria-hidden="true">×</span>
                </b-button>
            </b-col>
        </b-row>
        <b-row>
            <b-col>
                 <!---->
                <div class="bottom-scroll-bar m-2 ml-1 mr-1">
                    <b-input
                        id="w-text-input"
                        type="text"
                        dir="rtl"
                        @input="onTextChanged"
                        v-model="text"
                        class="w-input"
                        autofocus
                        rows="1"
                        cols="100"
                        max-rows="0"
                    >
                    </b-input>
                </div>
            </b-col>
        </b-row>
    </div>
</template>

<script lang="ts">
import { Component, Vue, Watch } from 'vue-property-decorator';
import { VirtualArtefactEditor } from '@/services/virtual-artefact';
import { Artefact } from '@/models/artefact';

@Component({
    name: 'edit-virtual-artefact-text-pane',
})
// export default class EditVirtualArtefactTextModal extends Vue {
export default class EditVirtualArtefactTextPane extends Vue {
    private text = '';
    private originalText = '';
    private editor?: VirtualArtefactEditor;
    private originalArtefact?: Artefact;

    private mounted() {
        this.onShown();
    }

    private onShown() {

        if (!this.$state.textFragmentEditor.editedVirtualArtefact) {
            this.$state.corrupted('EditorVirtualArtefact modal is shown with no edited virtual artefact');
        }
        this.originalArtefact = this.$state.textFragmentEditor.editedVirtualArtefact;

        this.editor = new VirtualArtefactEditor(this.$state.textFragmentEditor.editedVirtualArtefact);

        // Hide our artefact, and show the shadow artefact
        this.originalArtefact.isPlaced = false;
        this.text = this.originalText = this.editor.text;
    }

    private onHide() {

        if (!this.editor) {
            return;
        }

        this.editor.hide();

        this.originalArtefact!.isPlaced = true;
        this.$emit('close', { text: this.text, originalText: this.originalText, editor: this.editor });

        this.editor = undefined;
    }

    private destroyed() {
        this.onHide();
    }

    private onTextChanged() {
        // Tsvia: If the new text contains illegal characters (non Hebrew and not space), remove the illegal
        // characters
        if (!this.editor) {
            throw new Error('Editor object disappeared');
        }

        const hebTextOnly = this.stripNonHebChars(this.text);
        this.editor.text = hebTextOnly;

        this.$nextTick(() => {
            this.text = hebTextOnly;
        });
    }

    private stripNonHebChars(input: string): string {
        const hebrewAlphabet = 'אבגדהוזחטיכךלמנסעפצקרשתםןףץ ';
        let output = '';

        for ( const letter of input ) {
            if ( hebrewAlphabet.indexOf( letter ) !== -1) {
                output += letter;
            }
        }

        return output;
    }
}
</script>

<style lang="scss" scoped>
@import '@/assets/styles/_variables.scss';
@import '@/assets/styles/_fonts.scss';

.text-bar {
    font-style: $font-style;
    font-weight: $font-weight-1;
    font-size: $font-size-1;
    font-family: $font-family;
    color: $black;
    justify-content: inherit;
}

.border-around {
    border: 0.25rem outset   #C0C0C0;
    border-radius: 0.3rem;
}

.bottom-scroll-bar {
    width: 94%;
    direction: rtl;
    overflow-x: auto;
    /* overflow-x: scroll; */
    /* overflow: auto; */
    overflow-y: none;
}

.w-input {
    min-width: 100%;
    width: 500em;
    max-width: 100rem;
    direction: rtl;
    padding-left: 3rem;
    margin-left: 1rem;

}

</style>
