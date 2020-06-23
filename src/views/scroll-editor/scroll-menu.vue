<template>
    <div id="scroll-side-menu" role="tablist">
        <section class="center-btn" v-if="!readOnly">
            <div>{{ saveStatusMessage }}</div>
        </section>
        <section v-if="readOnly">
            {{ edition.name}}
            <edition-icons :edition="edition" :show-text="true" />
        </section>
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
        <section v-show="!readOnly">
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
                            <b-button
                                size="sm"
                                class="mb-2"
                                @click="openAddArtefactModal()"
                            >{{$t('misc.add')}} artefact</b-button>
                            <b-button
                                size="sm"
                                class="mb-2"
                                :disabled="!artefact"
                                @click="removeArtefact()"
                            >{{$t('misc.remove')}} artefact</b-button>
                            <artefact-toolbox
                                :params="params"
                                :artefactId="artefact && artefact.id"
                                @new-operation="onNewOperation($event)"
                                @save-group="onSaveGroup()"
                                @cancel-group="cancelGroup()"
                                @manageGroup="manageGroup()"
                                :selectedGroup="selectedGroup"
                            ></artefact-toolbox>
                        </section>
                        <section class="center-btn">
                            <b-button @click="onUndo()" size="sm" :disabled="!canUndo">Undo</b-button>
                            <b-button @click="onRedo()" size="sm" :disabled="!canRedo">Redo</b-button>
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
import ArtefactToolbox from './artefact-toolbox.vue';
import ArtefactService from '@/services/artefact';
import {
    ScrollEditorOperation,
    ScrollEditorOperationType,
    PlacementOperation
} from './operations';
import {
    OperationsManager,
    OperationsManagerStatus
} from '@/utils/operations-manager';
import EditionIcons from '@/components/cues/edition-icons.vue';
import { Placement } from '../../utils/Placement';
import { ArtefactGroup } from '../../models/edition';

@Component({
    name: 'scroll-menu',
    components: {
        Waiting,
        'add-artefact-modal': AddArtefactModal,
        'artefact-toolbox': ArtefactToolbox,
        'edition-icons': EditionIcons
    }
})
export default class ScrollMenu extends Vue {
    @Prop()
    public artefact: Artefact | undefined = undefined;
    @Prop()
    public statusIndicator!: OperationsManagerStatus;
    @Prop()
    private selectedGroup: ArtefactGroup = new ArtefactGroup([]);

    private params: ScrollEditorParams = new ScrollEditorParams();

    private get zoom(): any {
        return this.params.zoom;
    }

    private set zoom(val: any) {
        this.params.zoom = parseFloat(val);
        this.notifyChange('zoom', val);
    }
    private get edition() {
        return this.$state.editions.current! || {};
    }
    private get readOnly(): boolean {
        return this.edition.permission && this.edition.permission.readOnly;
    }

    public formatTooltip(): string {
        return (this.zoom * 100).toFixed(0) + '%';
    }
    public openAddArtefactModal() {
        this.$root.$emit('bv::show::modal', 'addArtefactModal');
    }
    // public onSave() {
    //     this.$emit('saveArt');
    // }
    public onNewOperation(operation: ScrollEditorOperation) {
        this.newOperation(operation);
    }
    public removeArtefact() {
        this.artefact!.isPlaced = false;
        this.setPlacement('delete', Placement.empty);
        // this.artefact = undefined;
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
    private setPlacement(
        opType: ScrollEditorOperationType,
        newTrans: Placement
    ) {
        const op = new PlacementOperation(
            this.artefact!.id,
            opType,
            this.artefact!.placement,
            newTrans
        );
        this.artefact!.placement = newTrans;
        this.newOperation(op);
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
    private onSaveGroup() {
        this.$emit('onSaveGroupArtefacts');
    }
    private cancelGroup() {
        this.$emit('onCancelGroup');
    }
     private manageGroup() {
        this.$emit('onManageGroup');
    }
}
</script>

<style lang="scss" scoped>
#scroll-side-menu {
    touch-action: pan-y;
    top: 0;
    right: 0;
}

button {
    margin-right: 10px;
}
</style>
