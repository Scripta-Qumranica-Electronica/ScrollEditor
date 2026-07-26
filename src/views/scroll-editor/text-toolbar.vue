<template>
     <b-container no-gutters class="side-toolbar ms-0 me-0 ps-1 pe-1">
        <text-fragment
            v-if="textFragment"
            :fragment="textFragment"
            id="text-box"
            class="mb-3"
            direction="rtl"
        ></text-fragment>

        <sign-attribute-pane v-if="!showEditReconTextBar"/>

        <edit-sign-modal></edit-sign-modal>

        <edit-virtual-artefact-text-pane
            v-if="showEditReconTextBar"
            @close="onVirtualTextClose($event)"
        >
        </edit-virtual-artefact-text-pane>

    </b-container>
</template>

<script lang="ts">
import { Component, Prop, Emit, Vue, toNative } from 'vue-facing-decorator';
import TextFragmentComponent from '@/components/text/text-fragment.vue';
import SignAttributePane from '@/components/sign-attributes/sign-attribute-pane.vue';
import EditSignModal from '@/components/text/edit-sign-modal.vue';
import EditVirtualArtefactTextPane from '@/components/text/edit-virtual-artefact-text.vue';
import { VirtualArtefactEditor } from '@/services/virtual-artefact';

@Component({
    name: 'text-toolbar',
    components: {
        'text-fragment': TextFragmentComponent,
        'sign-attribute-pane': SignAttributePane,
        'edit-sign-modal': EditSignModal,
        'edit-virtual-artefact-text-pane': EditVirtualArtefactTextPane,

    },
})
class TextToolbar extends Vue {

    public get textFragment() {
        return this.$state.textFragmentEditor.selectedTextFragment;
    }

    public get showEditReconTextBar(): boolean {
        return this.$state.showEditReconTextBar;
    }

    public onVirtualTextClose(param: { text: string, originalText: string, editor: VirtualArtefactEditor }) {
        this.$state.showEditReconTextBar = false;

        if (param.text !== param.originalText) {
            this.$emit('text-changed', { text: param.text, editor: param.editor });
        }
    }

}
export default toNative(TextToolbar);
</script>

<style lang="scss" scoped>
@import '@/assets/styles/_variables.scss';
@import '@/assets/styles/_fonts.scss';
.center-btn{
    margin-bottom: 8px;
}

hr.solid {
    /* border-top: 2px solid #999; */
    border-top: 1px solid #dee2e6;

}

.toggle-icon {
    margin-left: 5px;
    color: $blue;
}

.btn-xs {
    padding: 0.1rem 0.15rem;
    font-size: 0.75rem;
    line-height: 1;
    border-radius: 0.2rem;
}
</style>
