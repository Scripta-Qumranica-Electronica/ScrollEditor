<template>
    <div>
        <b-modal
            id="editVirtualArtefactText"
            title="Edit Reconstructed Text"
            hide-footer
            ref="my-modal"
        >
            <b-row>
                <b-col>
                    <div>
                        <b-input
                            type="text"
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

@Component({
    name: 'edit-virtual-artefact-text-modal',
})
export default class EditVirtualArtefactTextModal extends Vue {
    private text = '';
    private prevText = '';

    private onTextChanged() {
        console.debug(`Changed ${this.prevText} --> ${this.text}`);
        this.prevText = this.text;
    }
}
</script>

<style lang="scss" scoped>
</style>
