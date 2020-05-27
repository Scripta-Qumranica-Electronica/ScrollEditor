<template>
    <div id="scroll-side-menu" role="tablist">
        <section>
            <b-card no-body class="mb-1">
                <b-card-header header-tag="header" class="p-1">
                    <b-button block href="#" variant="info">{{$t('home.editorParameters')}}</b-button>
                </b-card-header>
                <b-collapse
                    style="display:block;"
                    id="accordion-params"
                    accordion="my-accordion-side"
                >
                    <b-card-body>
                        <section>
                            <div class="row">
                                <div class="col-5">Zoom: {{formatTooltip()}}</div>
                                <div class="col">
                                    <b-form-input
                                        ref="zoomRef"
                                        type="range"
                                        min="0.1"
                                        max="1"
                                        step="0.01"
                                        v-model="zoom"
                                    ></b-form-input>
                                </div>
                            </div>
                        </section>
                    </b-card-body>
                </b-collapse>
            </b-card>
        </section>
        <section>
            <b-card no-body class="mb-1">
                <b-card-header header-tag="header" class="p-1" role="tab">
                    <b-button
                        block
                        href="#"
                        v-b-toggle.accordion-actions
                        variant="info"
                    >{{$t('misc.actions')}}</b-button>
                </b-card-header>
                <b-collapse
                    id="accordion-actions"
                    style="display:block;"
                    accordion="my-accordion-side"
                    role="tabpanel"
                >
                    <b-card-body>
                        <section class="center-btn">
                            <b-button @click="openAddArtefactModal()">{{$t('misc.add')}} artefact</b-button>
                            <artefact-toolbox
                                :params="params"
                                :artefact="artefact"
                                @new-operation="onNewOperation($event)"
                            ></artefact-toolbox>
                            <b-button
                                :disabled="!isDirty"
                                @click="onSave()"
                            >{{$t('misc.save')}} artefacts</b-button>
                        </section>
                        <section
                            class="center-btn"
                        >
                            <b-button @click="onUndo()" :disabled="!canUndo">Undo</b-button>
                            <b-button @click="onRedo()" :disabled="!canRedo">Redo</b-button>
                        </section>
                        <section class="center-btn">
                            <p>{{ saveStatusMessage }}</p>
                        </section>
                    </b-card-body>
                </b-collapse>
            </b-card>
        </section>
        <add-artefact-modal></add-artefact-modal>
    </div>
</template>

<script lang="ts">
import { Component, Prop, Vue, Emit } from 'vue-property-decorator';
import Waiting from '@/components/misc/Waiting.vue';
import { Artefact } from '@/models/artefact';
import AddArtefactModal from './add-artefact-modal.vue';
import {
    ArtefactEditorParams,
    ArtefactEditorParamsChangedArgs,
    ScrollEditorParams
} from '../artefact-editor/types';
import { TransformationDTO } from '@/dtos/sqe-dtos';
import ArtefactToolbox from './artefact-toolbox.vue';
import ArtefactService from '@/services/artefact';
import { ScrollEditorOperation } from './operations';
import { OperationsManager, OperationsManagerStatus } from '@/utils/operations-manager';

@Component({
    name: 'scroll-menu',
    components: {
        Waiting,
        'add-artefact-modal': AddArtefactModal,
        'artefact-toolbox': ArtefactToolbox
    }
})
export default class ScrollMenu extends Vue {
    @Prop()
    public artefact: Artefact | undefined = undefined;
    @Prop()
    public statusIndicator!: OperationsManagerStatus;

    private params: ScrollEditorParams = new ScrollEditorParams();


    private get zoom(): any {
        return this.params.zoom;
    }

    private set zoom(val: any) {
        this.params.zoom = parseFloat(val);
        this.notifyChange('zoom', val);
    }

    private get artefactSelect(): Artefact | undefined {
        return this.artefact;
    }

    public formatTooltip(): string {
        return (this.zoom * 100).toFixed(0) + '%';
    }
    public openAddArtefactModal() {
        this.$root.$emit('bv::show::modal', 'addArtefactModal');
    }
    public onSave() {
        this.$emit('saveArt');
    }
    public onNewOperation(operation: ScrollEditorOperation) {
        this.newOperation(operation);
    }
    public notifyChange(paramName: string, paramValue: any) {
        const args = {
            property: paramName,
            value: paramValue,
            params: this.params
        } as ArtefactEditorParamsChangedArgs;
        this.$emit('paramsChanged', args);
    }

    public mounted() {
        this.zoom = 0.1;
    }

    private get canUndo(): boolean {
        return this.statusIndicator.canUndo;
    }

    private get canRedo(): boolean {
        return this.statusIndicator.canRedo;
    }

    private get isDirty(): boolean {
        return this.statusIndicator.isDirty;
    }

    private onUndo() {
        this.undo();
    }
    @Emit()
    private undo() {
        // Just emit the event
    }

    private onRedo() {
        this.redo();
    }
    @Emit()
    private redo() {
        // Just emit the event
    }

    @Emit()
    private newOperation(op: ScrollEditorOperation) {
        return op;
    }

    private get saveStatusMessage(): string {
        if (this.statusIndicator.isSaving) {
            return 'Saving...';
        }
        if (this.statusIndicator.isDirty) {
            return 'Save pending';
        }
        return 'Scroll Saved';
    }
}
</script>

<style lang="scss" scoped>
#scroll-side-menu {
    touch-action: pan-y;
    top: 0;
    right: 0;
}
</style>
