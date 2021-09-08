<template>
    <toolbox :subject="subject">
        <toolbar-icon-button :title="$t('home.undo')" icon="undo" :disabled="!canUndo" @click="onUndo"/>
        <toolbar-icon-button :title="$t('home.redo')" icon="redo" :disabled="!canRedo" @click="onRedo"/>
    </toolbox>
</template>
<script lang="ts">
import Vue from 'vue';
import { Component, Prop } from 'vue-property-decorator';
import ToolbarIconButton from './toolbar-icon-button.vue';
import Toolbox from './toolbox.vue';

@Component({
    name: 'undo-redo-toolbox',
    components: {
        toolbox: Toolbox,
        'toolbar-icon-button': ToolbarIconButton
    }
})
export default class UndoRedoToolbox extends Vue {
    @Prop({ default: 'Undo/redo'}) public subject!: string;

    protected get canUndo() {
        return this.$state.operationsManager?.canUndo || false;
    }

    protected get canRedo() {
        return this.$state.operationsManager?.canRedo || false;
    }

    protected onUndo() {
        this.$state.operationsManager!.undo();
    }

    protected onRedo() {
        this.$state.operationsManager!.redo();
    }
}
</script>
