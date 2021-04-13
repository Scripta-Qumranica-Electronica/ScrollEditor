<template>
     <b-container no-gutters class="side-toolbar ml-0 mr-0 pl-1 pr-1">
        <text-fragment
            v-if="textFragment"
            :fragment="textFragment"
            id="text-box"
            class="mb-3"
            direction="rtl"
        ></text-fragment>
        <sign-attribute-pane/>
        <edit-sign-modal></edit-sign-modal>
        <edit-virtual-artefact-text-modal></edit-virtual-artefact-text-modal>
    </b-container>
</template>

<script lang="ts">
import { Component, Prop, Emit, Model, Vue } from 'vue-property-decorator';
import TextFragmentComponent from '@/components/text/text-fragment.vue';
import SignAttributePane from '@/components/sign-attributes/sign-attribute-pane.vue';
import EditSignModal from '@/components/text/edit-sign-modal.vue';
import EditVirtualArtefactTextModal from '@/components/text/edit-virtual-artefact-text.vue';

@Component({
    name: 'text-toolbar',
    components: {
        'text-fragment': TextFragmentComponent,
        'sign-attribute-pane': SignAttributePane,
        'edit-sign-modal': EditSignModal,
        'edit-virtual-artefact-text-modal': EditVirtualArtefactTextModal,
        // 'artefact-toolbox': ArtefactToolbox,
    },
})

export default class TextToolbar extends Vue {
    public get textFragment() {
        return this.$state.textFragmentEditor.selectedTextFragment;
    }
}
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