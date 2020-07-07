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
                            <b-card no-body class="mb-1">
                                <b-card-header header-tag="header" class="p-1" role="tab">
                                    <b-button-group size="sm" class="m-1">
                                        <b-button
                                            size="sm"
                                            class="mr-2"
                                            @click="openAddArtefactModal()"
                                        >{{$t('misc.add')}} artefact</b-button>
                                        <b-button
                                            size="sm"
                                            :disabled="!artefact"
                                            @click="removeArtefactOrGroup()"
                                        >{{$t('misc.remove')}} artefact</b-button>
                                    </b-button-group>
                                </b-card-header>
                            </b-card>

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
                            <b-button-group size="sm" class="m-1">
                                <b-button @click="onUndo()" size="sm" :disabled="!canUndo">Undo</b-button>
                                <b-button @click="onRedo()" size="sm" :disabled="!canRedo">Redo</b-button>
                            </b-button-group>
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
                        v-b-toggle.accordion-metrics
                        variant="info"
                    >{{$t('misc.metrics')}}</b-button>
                </b-card-header>
                <b-collapse id="accordion-metrics" accordion="my-accordion-side" role="tabpanel">
                    <b-card-body>
                        <section>
                            <div>{{edition.metrics.width}} X {{edition.metrics.height}}</div>
                            <b-form-select
                                v-model="selectedSide"
                                :options="sidesOptions"
                                size="sm"
                                class="ml-2 filtering"
                            ></b-form-select>
                            <b-form-input
                                id="input-small"
                                size="sm"
                                min="1"
                                type="number"
                                v-model="metricsInput"
                            ></b-form-input>
                            <b-button class="m-1" size="sm" @click="resizeScroll(1)">add</b-button>
                            <b-button class="m-1" size="sm" @click="resizeScroll(-1)">cut</b-button>
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
    ArtefactPlacementOperationType,
    ArtefactPlacementOperation,
    GroupPlacementOperation
} from './operations';
import {
    OperationsManager,
    OperationsManagerStatus
} from '@/utils/operations-manager';
import EditionIcons from '@/components/cues/edition-icons.vue';
import { Placement } from '../../utils/Placement';
import { ArtefactGroup, EditionInfo } from '../../models/edition';
import { DropdownOption } from '@/utils/helpers';
import { UpdateEditionManuscriptMetricsDTO, EditionManuscriptMetricsDTO } from '../../dtos/sqe-dtos';

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
    private selectedGroup: ArtefactGroup = ArtefactGroup.generateGroup([]);
    private params: ScrollEditorParams = new ScrollEditorParams();
    private sidesOptions: { text: string; value: string }[] = [
        { text: 'Left', value: 'left' },
        { text: 'Right', value: 'right' },
        { text: 'Top', value: 'top' },
        { text: 'Down', value: 'down' }
    ];
    private selectedSide: string = 'left';
    private metricsInput: number = 1;
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
    private get selectedArtefacts(): Array<Artefact | undefined> {
        return this.selectedGroup.artefactIds.map((x: number) =>
            this.$state.artefacts.find(x)
        );
    }
    // public positionScrollChanged(position: DropdownOption) {
    //     this.positionScroll = position;
    // }

    public formatTooltip(): string {
        return (this.zoom * 100).toFixed(0) + '%';
    }
    public openAddArtefactModal() {
        this.$root.$emit('bv::show::modal', 'addArtefactModal');
    }
    public onNewOperation(operation: ScrollEditorOperation) {
        this.newOperation(operation);
    }

    public removeArtefactOrGroup() {
        const operations: ScrollEditorOperation[] = [];

        this.selectedArtefacts.forEach(art => {
            art!.isPlaced = false;
            operations.push(
                this.createOperation('delete', Placement.empty, art)
            );
        });
        const groupPlacementOperations = new GroupPlacementOperation(
            this.selectedGroup.groupId,
            operations,
            'delete'
        );
        this.newOperation(groupPlacementOperations);

        // if it's a real group, empty it by calling onDeleteGroup
        if (this.selectedArtefacts.length > 1) {
            this.$emit('onDeleteGroup', this.selectedGroup.groupId);
        }
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
    protected created() {
        this.$state.eventBus.$on('cancel-group', this.cancelGroup);
    }

    protected destroyed() {
        this.$state.eventBus.$off('cancel-group', this.cancelGroup);
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

    private get artefacts() {
        return this.$state.artefacts.items || [];
    }

    private get placedArtefacts() {
        return this.artefacts.filter(x => x.isPlaced);
    }

    private onUndo() {
        this.undo();
    }
    private setPlacement(
        opType: ArtefactPlacementOperationType,
        newTrans: Placement
    ) {
        const op = new ArtefactPlacementOperation(
            this.artefact!.id,
            opType,
            this.artefact!.placement,
            newTrans
        );
        this.artefact!.placement = newTrans;
        this.newOperation(op);
    }
    private createOperation(
        opType: ArtefactPlacementOperationType,
        newPlacement: Placement,
        artefact: Artefact | undefined
    ): ArtefactPlacementOperation {
        const op = new ArtefactPlacementOperation(
            artefact!.id,
            opType,
            artefact!.placement,
            newPlacement
        );
        artefact!.placement = newPlacement;
        return op;
    }

    private resizeScroll(direction: number) {
        const newMetrics: EditionManuscriptMetricsDTO = { ...this.edition.metrics };

        switch (this.selectedSide) {
            case 'left':
            case 'right':
                newMetrics.width += +this.metricsInput * direction;
                if (this.selectedSide === 'left') {
                    newMetrics.xOrigin +=
                        +this.metricsInput * direction * -1;
                }
                break;

            case 'top':
            case 'down':
                newMetrics.height += +this.metricsInput * direction;
                if (this.selectedSide === 'top') {
                    newMetrics.yOrigin +=
                        +this.metricsInput * direction * -1;
                }
                break;
        }
        if (direction === -1 && !this.allowResizing(this.selectedSide, newMetrics)) {
            this.$toasted.error(
                'Cannot resize scroll because artefacts will be cropped'
            , {duration: 3000});

        } else {
            this.edition.metrics = {...newMetrics};
        }
        this.$emit('metricsChange');
    }

    private allowResizing(
        side: string,
        newMetrics: EditionManuscriptMetricsDTO
    ): boolean {
        // left : XOrigin <= Xmin
        if (side === 'left') {
            const minX = Math.min(
                ...this.placedArtefacts.map(art => art.placement.translate.x!)
            ) / this.edition.ppm;
            return newMetrics.xOrigin <= minX;
        }

        // right : Xmax <= width
        if (side === 'right') {
            const maxX = Math.max(
                ...this.placedArtefacts.map(
                    art => art.placement.translate.x! + art.boundingBox.width
                )
            ) / this.edition.ppm;
            return maxX <= newMetrics.width;
        }

        // top : YOrigin <= Ymin
        if (side === 'top') {
            const minY = Math.min(
                ...this.placedArtefacts.map(art => art.placement.translate.y!)
            ) / this.edition.ppm;
            return newMetrics.yOrigin <= minY;
        }

        // down : Ymax <= height
        if (side === 'down') {
            const maxY = Math.max(
                ...this.placedArtefacts.map(
                    art => art.placement.translate.y! + art.boundingBox.height
                )
            ) / this.edition.ppm;
            return maxY <= newMetrics.height;
        }

        return true;
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
</style>
