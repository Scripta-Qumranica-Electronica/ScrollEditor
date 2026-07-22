<template>
    <toolbox :subject="subject">
        <toolbar-icon-button :title="$t('home.undo')" icon="undo" :disabled="!canUndo" @click="onUndo"/>
        <toolbar-icon-button :title="$t('home.redo')" icon="redo" :disabled="!canRedo" @click="onRedo"/>
    </toolbox>
</template>
<script lang="ts">
import { Component, Prop, Vue, toNative } from 'vue-facing-decorator';
import ToolbarIconButton from './toolbar-icon-button.vue';
import Toolbox from './toolbox.vue';

@Component({
    name: 'undo-redo-toolbox',
    components: {
        toolbox: Toolbox,
        'toolbar-icon-button': ToolbarIconButton
    }
})
class UndoRedoToolbox extends Vue {
    @Prop({ default: 'Undo/redo'}) public subject!: string;

    public get canUndo() {
        return this.$state.operationsManager?.canUndo || false;
    }

    public get canRedo() {
        return this.$state.operationsManager?.canRedo || false;
    }

    public onUndo() {
        this.$state.operationsManager!.undo();
    }

    public onRedo() {
        this.$state.operationsManager!.redo();
    }
}
export default toNative(UndoRedoToolbox);
</script>
