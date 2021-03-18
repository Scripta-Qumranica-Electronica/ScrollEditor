<template>
     <b-container no-gutters class="side-toolbar ml-0 mr-0 pl-0 pr-0">
         <p>Text Toolbar</p>
    </b-container>
</template>

<script lang="ts">
import { Component, Prop, Emit, Model, Vue } from 'vue-property-decorator';
import { ScrollEditorState } from '@/state/scroll-editor';
import { ScrollEditorParams, ScrollEditorMode } from '../artefact-editor/types';

@Component({
    name: 'text-toolbar',
    components: {
        // 'artefact-toolbox': ArtefactToolbox,
    },
})

export default class TextToolbar extends Vue {
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