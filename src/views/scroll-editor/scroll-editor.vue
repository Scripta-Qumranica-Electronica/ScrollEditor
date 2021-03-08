<template>
    <div>
        <div v-if="waiting" class="col">
            <Waiting></Waiting>
        </div>
        <div v-if="!waiting">
            <div class="mb-3 header-actions">
                <b-row class="mx-4 py-2">
                    <div class="col-xl-8 col-lg-8">
                        <!-- <edition-header></edition-header> -->
                    </div>
                    <b-col class="col-lg-3 pl-0">
                        <div class="btn-tf">
                            <b-button
                                size="sm"
                                class="mr-2"
                                @click="openAddArtefactModal()"
                                >{{ $t('misc.add') }} artefact</b-button
                            >
                            <b-button
                                class="btn-remove"
                                size="sm"
                                @click="removeArtefactOrGroup()"
                                >{{ $t('misc.remove') }}</b-button
                            >
                        </div>
                    </b-col>
                </b-row>
            </div>
            <div class="mt-4 editor-container">
                <b-row no-gutters class="border-bottom" align-v="center">
                    <div class="col-2 border-right">
                        <div>
                            <b-row align-v="end">
                                <div class="col-5">
                                    <b-form-select
                                        v-model="selectedSide"
                                        :options="sidesOptions"
                                        size="sm"
                                        class="ml-2 mt-2"
                                    ></b-form-select>
                                </div>
                                <div class="col-5">
                                    <b-form-input
                                        size="sm"
                                        min="1"
                                        type="number"
                                        v-model="metricsInput"
                                    ></b-form-input>
                                </div>
                                <span>mm</span>
                            </b-row>
                            <b-row>
                                <div class="col-6 ml-5">
                                    <b-button-group>
                                        <b-button
                                            class="m-1"
                                            size="sm"
                                            @click="resizeScroll(1)"
                                            >Add</b-button
                                        >
                                        <b-button
                                            class="m-1"
                                            size="sm"
                                            @click="resizeScroll(-1)"
                                            >Cut</b-button
                                        >
                                    </b-button-group>
                                </div>
                            </b-row>
                        </div>
                    </div>
                    <div class="col-10">
                        <b-row align-v="center" class="row ml-2">
                            <b-col
                               class="col-4 col-sm-5 col-xs-5 position-zoom">
                                <zoom-toolbar
                                        v-model="params.zoom"
                                        :zoom="params.zoom"
                                        delta="0.05"
                                        @zoomChanged="onZoomChanged($event)"
                                />
                            </b-col>


                            <div class="col-5">
                                <artefact-toolbox
                                    @new-operation="newOperation($event)"
                                    @save-group="saveGroupArtefacts()"
                                    @cancel-group="cancelGroup()"
                                ></artefact-toolbox>
                            </div>
                            <div class="row col-5">
                                <div  class="col-xl-4 col-md-4">
                                    <b-form-checkbox
                                        switch
                                        size="sm"
                                        @input="onDisplayROIs($event)"
                                        >Display ROIs</b-form-checkbox
                                    >
                                </div>
                                <div class="col-xl-4 col-md-4">
                                    <b-form-checkbox
                                        switch
                                        size="sm"
                                        @input="
                                            onDisplayReconstructedText($event)
                                        "
                                        >Display Reconstructed
                                        Text</b-form-checkbox
                                    >
                                </div>
                                <div class="col-xl-4 col-md-4">
                                    <b-form-checkbox
                                        switch
                                        size="sm"
                                        @input="onDisplayText($event)"
                                        >Display Text</b-form-checkbox
                                    >
                                </div>
                            </div>
                        </b-row>
                    </div>
                </b-row>
                <b-row no-gutters>
                    <div
                        class="col-2 border-right"
                        v-if="scrollEditorState.viewport"
                    >
                        <div class="mb-3">
                            <scroll-map @navigate-to-point="navigateToPoint" />
                        </div>
                        <div class="ml-3 mb-3">
                            <span
                                ><b>{{ $t('home.editionSize') }}:</b></span
                            >
                            <div>
                                {{ edition.metrics.width }} mm X
                                {{ edition.metrics.height }} mm
                            </div>
                        </div>
                        <div class="ml-3 mb-3">
                            <span
                                ><b>{{ $t('home.viewPortSize') }}:</b></span
                            >
                            <div>
                                {{ viewportSizeWidth }} mm X
                                {{ viewportSizeHeight }} mm
                            </div>
                        </div>
                        <div class="ml-3 mb-3">
                            <span><b>Position:</b></span>
                            <div>
                                X: {{ pointerPositionX }}, Y:
                                {{ pointerPositionY }}
                            </div>
                        </div>
                    </div>
                    <div class="col-10 artefact-container">
                        <div
                            id="artefact-container"
                            ref="artefactContainer"
                            @scroll="onScroll"
                        >
                            <scroll-ruler
                                :height="actualHeight"
                                :width="actualWidth"
                                :horizontalTicks="editionWidth"
                                :verticalTicks="editionHeight"
                                :zoom="params.zoom"
                                :ppm="edition.ppm"
                            ></scroll-ruler>
                            <scroll-area
                                ref="scrollAreaRef"
                                @onSelectArtefact="selectArtefact($event)"
                                @onSaveGroupArtefacts="saveGroupArtefacts()"
                                @new-operation="newOperation($event)"
                                @onCancelGroup="cancelGroup()"
                            ></scroll-area>
                        </div>
                    </div>
                </b-row>
                <add-artefact-modal></add-artefact-modal>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import { Component, Emit, Vue } from 'vue-property-decorator';
import Waiting from '@/components/misc/Waiting.vue';
import { IIIFImage, ImageStack } from '@/models/image';
import { Polygon } from '@/utils/Polygons';
import { BoundingBox, Point } from '@/utils/helpers';
import Zoomer, {
    ZoomEventArgs,
    RotateEventArgs,
} from '@/components/misc/zoomer.vue';
import EditionIcons from '@/components/cues/edition-icons.vue';
import { ArtefactGroup, EditionInfo } from '../../models/edition';
import AddArtefactModal from './add-artefact-modal.vue';
import ArtefactToolbox from './artefact-toolbox.vue';
import ScrollArea from './scroll-area.vue';
import ScrollRuler from './scroll-ruler.vue';
import {
    ArtefactPlacementOperation,
    ArtefactPlacementOperationType,
    EditGroupOperation,
    EditionMetricOperation,
    GroupPlacementOperation,
    ScrollEditorOperation,
} from './operations';
import { ScrollEditorState } from '@/state/scroll-editor';
import { Placement } from '@/utils/Placement';
import { Artefact } from '@/models/artefact';
import { OperationsManager, SavingAgent } from '@/utils/operations-manager';
import { ScrollEditorParams } from '../artefact-editor/types';
import { EditionManuscriptMetricsDTO } from '@/dtos/sqe-dtos';
import EditionService from '@/services/edition';
import ArtefactService from '@/services/artefact';
import ScrollMap from './scroll-map.vue';
import { EditorParamsChangedArgs } from '../imaged-object-editor/types';
import { ArtefactTextFragmentData } from '@/models/text';
import ZoomToolbar from '@/components/toolbars/zoom-toolbar.vue';


@Component({
    name: 'scroll-editor',
    components: {
        Waiting,
        'zoomer': Zoomer,
        'add-artefact-modal': AddArtefactModal,
        'edition-icons': EditionIcons,
        'artefact-toolbox': ArtefactToolbox,
        'scroll-area': ScrollArea,
        'scroll-ruler': ScrollRuler,
        'scroll-map': ScrollMap,
        'zoom-toolbar': ZoomToolbar,
    },
})
export default class ScrollEditor
    extends Vue
    implements SavingAgent<ScrollEditorOperation> {
    private operationsManager = new OperationsManager<ScrollEditorOperation>(
        this
    );
    private waiting: boolean = true;
    private editionId: number = 0;
    private observer?: ResizeObserver;
    private editionService = new EditionService();
    private artefactService = new ArtefactService();

    private sidesOptions: Array<{ text: string; value: string }> = [
        { text: 'Left', value: 'left' },
        { text: 'Right', value: 'right' },
        { text: 'Top', value: 'top' },
        { text: 'Down', value: 'down' },
    ];
    private selectedSide: string = 'left';
    private metricsInput: number = 1;

    private get scrollEditorState(): ScrollEditorState {
        return this.$state.scrollEditor;
    }
    private get selectedArtefacts() {
        return this.scrollEditorState.selectedArtefacts;
    }
    public get selectedArtefact() {
        return this.scrollEditorState.selectedArtefact;
    }
    public get selectedGroup() {
        return this.scrollEditorState.selectedGroup;
    }
    private get params(): ScrollEditorParams {
         return this.scrollEditorState.params || new ScrollEditorParams();
    }
    private get edition() {
        return this.$state.editions.current! || {};
    }
    public get editionWidth(): number {
        return this.edition.metrics.width;
    }
    public get editionHeight(): number {
        return this.edition.metrics.height;
    }
    private get viewportSizeWidth() {
        return Math.round(
            this.scrollEditorState.viewport!.width / this.edition.ppm
        );
    }
    private get viewportSizeHeight() {
        return Math.round(
            this.scrollEditorState.viewport!.height / this.edition.ppm
        );
    }
    private get actualWidth(): number {
        return this.edition.metrics.width * this.edition.ppm * this.zoomLevel;
    }
    private get actualHeight(): number {
        return this.edition.metrics.height * this.edition.ppm * this.zoomLevel;
    }
    private get zoomLevel() {
        return (this.params && this.params.zoom) || 1;
    }
    private get pointerPositionX() {
        return (
            this.scrollEditorState.pointerPosition.x /
            this.params.zoom /
            this.edition.ppm
        ).toFixed(2);
    }
    private get pointerPositionY() {
        return (
            this.scrollEditorState.pointerPosition.y /
            this.params.zoom /
            this.edition.ppm
        ).toFixed(2);
    }

    public async saveEntities(ops: ScrollEditorOperation[]): Promise<boolean> {
        const allMovedArtefactIds = new Set<number>();
        const allEditedGroupIds = new Set<number>();
        const allDeletedGroupIds = new Set<number>();
        let saveMetrics = false;

        ops.forEach((op) => {
            // Take artefact placements operations
            if (op instanceof ArtefactPlacementOperation) {
                allMovedArtefactIds.add(op.artefactId);
            } else if (op instanceof GroupPlacementOperation) {
                op.operations.forEach((artOp) =>
                    allMovedArtefactIds.add(artOp.getId())
                );
                if (op.type === 'delete') {
                    allDeletedGroupIds.add(op.groupId);
                }
                // Take EditGroup operations
            } else if (op instanceof EditGroupOperation) {
                allEditedGroupIds.add(op.groupId);
            } else if (op instanceof EditionMetricOperation) {
                saveMetrics = true;
            }
        });

        try {
            // save artefacts in bulk
            const allMovedArtefacts = Array.from(allMovedArtefactIds).map(
                (artId) => this.$state.artefacts.find(artId)!
            );
            allMovedArtefacts.forEach((art) => art.prepareForBackend());

            if (allMovedArtefacts) {
                await this.editionService.updateArtefactDTOs(
                    this.editionId,
                    allMovedArtefacts
                );
            }

            // save groups
            if (allEditedGroupIds.size) {
                allEditedGroupIds.forEach(async (groupId) => {
                    const group = this.edition.artefactGroups.find(
                        (artGroup) => artGroup.id === groupId
                    );
                    if (!group) {
                        console.error(
                            'Cannot find group in edition with id: ' + groupId
                        );
                        return;
                    }
                    // Save new group with id < 0
                    if (group.id < 0) {
                        if (group.artefactIds.length >= 2) {
                            const savedGroup = await this.editionService.newArtefactGroup(
                                this.editionId,
                                group
                            );
                            group.groupId = savedGroup.id;
                            this.updateOperationId(groupId, savedGroup.id);
                            this.selectGroup(group);
                        }
                        // Save edited group with length > 1
                    } else if (group.id > 0) {
                        if (group.artefactIds.length >= 2) {
                            const savedGroup = await this.editionService.updateArtefactGroup(
                                this.editionId,
                                group
                            );
                        } else {
                            await this.editionService.deleteArtefactGroup(
                                this.editionId,
                                groupId
                            );
                        }
                    }
                });
            }

            // delete groups
            allDeletedGroupIds.forEach(async (groupId) => {
                await this.editionService.deleteArtefactGroup(
                    this.editionId,
                    groupId
                );
            });

            // save metrics
            if (saveMetrics) {
                await this.editionService.updateMetrics(
                    this.editionId,
                    this.edition.metrics
                );
            }

            return true;
        } catch (error) {
            console.error(error);
            this.$toasted.error(error, { duration: 3000 });
            return false;
        }
    }

    private get artefacts() {
        return this.$state.artefacts.items || [];
    }
    private get placedArtefacts() {
        return this.artefacts.filter((x) => x.isPlaced);
    }


    protected created() {
        this.$state.eventBus.on('select-group', this.selectGroup);
        this.$state.eventBus.on('save-group', this.saveGroupArtefacts);
        this.$state.eventBus.on('delete-group', this.deleteGroup);
        this.$state.eventBus.on('update-operation-id', this.updateOperationId);
        this.observer = new ResizeObserver((entries) => this.onResize(entries));
    }

    protected destroyed() {
        this.$state.eventBus.off('select-group', this.selectGroup);
        this.$state.eventBus.off('save-group', this.saveGroupArtefacts);
        this.$state.eventBus.off('delete-group', this.deleteGroup);
        this.$state.eventBus.off('update-operation-id', this.updateOperationId);

        if (this.observer) {
            this.observer.disconnect();
        }

        this.$state.operationsManager = null;
    }

    private async mounted() {
        this.waiting = true;
        // This code is not in the created method since it's asynchronous, and Vue doesn't wait for
        // an asynchornous created to finish before calling mounted. Instead of adding a synchronization
        // between created and mounted, we just moved it to mounted.
        this.editionId = parseInt(this.$route.params.editionId, 10);
        await this.$state.prepare.edition(this.editionId);

        const edition = this.$state.editions.find(this.editionId); // Set the current scroll
        if (!edition) {
            this.$router.push({ path: '/' });
        }
        this.$state.editions.current = edition;
        this.$state.artefacts.current = null;
        this.$state.imagedObjects.current = null;
        this.waiting = false;
        await this.$nextTick();
        this.$root.$on('bv::modal::hide', (bvEvent: any, modalId: any) => {
            if (modalId === 'addArtefactModal') {
                const artefactId = bvEvent.trigger;
                this.onAddArtefactModalClose(artefactId);
            }
        });

        this.$state.scrollEditor = new ScrollEditorState();
        this.observer!.observe(this.$refs.artefactContainer as Element);
        this.calculateViewport();
        this.$state.operationsManager = this.operationsManager;
    }

    private async beforeRouteUpdate(to: any, from: any, next: () => void) {
        this.editionId = parseInt(to.params.editionId, 10);
        await this.$state.prepare.edition(this.editionId);
        next();
    }


    private onMetricsChange() {
        this.calculateViewport();
    }

    private async onAddArtefactModalClose(artId: number) {
        const artefact = this.$state.artefacts.find(artId);
        if (artefact) {
            const numberOfPlaced = this.artefacts.filter((x) => x.isPlaced)
                .length;

            const orderedArtefacts = this.artefacts
                .filter((x) => x.isPlaced)
                .map((x) => x.placement.zIndex);
            const maxZindex = orderedArtefacts.length
                ? Math.max(...orderedArtefacts)
                : 0;

            const placement = new Placement({
                translate: {
                    x: 800 * numberOfPlaced,
                    y: 400,
                },
                scale: 1,
                rotate: 0,
                zIndex: maxZindex + 1,
                mirrored: false,
            });

            const operation = new ArtefactPlacementOperation(
                artefact.id,
                'add',
                Placement.empty,
                placement,
                artefact.isPlaced,
                true
            );
            artefact.placeOnScroll(placement);

            // load artefact Rois
            await Promise.all(
                artefact.textFragments.map((tf: ArtefactTextFragmentData) =>
                    this.$state.prepare.textFragment(artefact.editionId, tf.id)
                )
            );

            this.newOperation(operation);
            this.selectArtefact(artefact);
        }
    }

    private notifyChange(paramName: string, paramValue: any) {
        const args = ({
            property: paramName,
            value: paramValue,
            params: this.params,
        } as unknown) as EditorParamsChangedArgs; // TODO: Change this to the right type
        this.$emit('paramsChanged', args);
    }


    private onZoomChanged(val: number) {
        this.params.zoom = val; //
        this.calculateViewport();
    }

    // private zoomClick(percent: number) {
    //     this.zoom += percent;
    //     this.notifyChange('zoomScrollEditor', this.params.zoom);
    //     zoomScrollEditor doesnt exist
    // }


    // public set zoom(val: number) {
    //     if (!val) {
    //         val = 10;
    //     }
    //     this.params.zoom = parseFloat(val.toString()) / 100;
    //     this.onZoomChanged(); //
    // }


    private selectArtefact(artefact: Artefact | undefined) {
        if (!artefact) {
            this.selectGroup(undefined);
        }

        const existingGroup = this.edition!.artefactGroups.find(
            (x) => artefact && x.artefactIds.includes(artefact.id)
        );

        if (this.params.mode === 'manageGroup') {
            if (!this.selectedGroup) {
                const newGroup = ArtefactGroup.generateGroup([
                    this.selectedArtefact!.id,
                ]);
                this.scrollEditorState.selectGroup(newGroup);
            }

            const isSelectedIndex = this.selectedGroup!.artefactIds.findIndex(
                (a) => a === artefact!.id
            );

            if (isSelectedIndex > -1) {
                // remove artefact from current group
                this.selectedGroup!.artefactIds.splice(isSelectedIndex, 1);
            } else if (!existingGroup) {
                // if artefact not in any group or in this group but was unselected
                this.selectedGroup!.artefactIds.push(artefact!.id);
            }
        } else {
            if (existingGroup) {
                // if artefact already in group
                this.scrollEditorState.selectGroup(existingGroup);
            } else {
                this.scrollEditorState.selectArtefact(artefact!);
            }
        }
    }

    private selectGroup(group: ArtefactGroup | undefined) {
        this.scrollEditorState.selectGroup(group);
    }

    private onResize(entries: ResizeObserverEntry[]) {
        this.calculateViewport();
    }

    private onScroll() {
        this.calculateViewport();
    }

    private calculateViewport() {
        const div = this.$refs.artefactContainer as Element;
        const zoom = this.params?.zoom || 1;

        // Get the client width and height in edition coordinates from the client rect
        const pixelRect = div.getBoundingClientRect();
        const width = pixelRect.width / zoom;
        const height = pixelRect.height / zoom;

        // Get the scroll offset in edition coordinates from the element itself
        let top = div.scrollTop / zoom;
        let left = div.scrollLeft / zoom;

        // Take into account the edition's origin
        left += this.edition.metrics.xOrigin * this.edition.ppm;
        top += this.edition.metrics.yOrigin * this.edition.ppm;

        const viewport = new BoundingBox(left, top, width, height);
        // Vue.set(this.$state.scrollEditor, 'viewport', viewport);
        this.$state.scrollEditor.viewport = viewport;
    }

    private updateOperationId(oldId: number, newId: number) {
        this.operationsManager.updateStackIds(oldId, newId);
    }

    private createOperation(
        opType: ArtefactPlacementOperationType,
        newPlacement: Placement,
        artefact: Artefact | undefined,
        newIsPlaced: boolean
    ): ArtefactPlacementOperation {
        const op = new ArtefactPlacementOperation(
            artefact!.id,
            opType,
            artefact!.placement,
            newPlacement,
            artefact!.isPlaced,
            newIsPlaced
        );
        artefact!.placement = newPlacement;
        artefact!.isPlaced = newIsPlaced;

        return op;
    }

    private navigateToPoint(pt: Point) {
        const div = this.$refs.artefactContainer as Element;
        const viewport = this.$state.scrollEditor.viewport;
        const zoom = this.params?.zoom || 1;

        if (!viewport) {
            console.warn("Can't navigate with a null viewport");
            return;
        }

        // First, find the new top-left of the viewport, in edition coordinates
        let left = pt.x - viewport.width / 2;
        let top = pt.y - viewport.height / 2;

        // Now adjust the xOrigin, yOrigin offset
        left -= this.edition.metrics.xOrigin * this.edition.ppm;
        top -= this.edition.metrics.yOrigin * this.edition.ppm;

        // Take the coom into account
        left *= zoom;
        top *= zoom;

        // Finally we can scroll
        div.scroll(left, top);
    }

    private resizeScroll(direction: number) {
        const newMetrics: EditionManuscriptMetricsDTO = {
            ...this.edition.metrics,
        };

        switch (this.selectedSide) {
            case 'left':
            case 'right':
                newMetrics.width += +this.metricsInput * direction;
                if (this.selectedSide === 'left') {
                    newMetrics.xOrigin += +this.metricsInput * direction * -1;
                }
                break;

            case 'top':
            case 'down':
                newMetrics.height += +this.metricsInput * direction;
                if (this.selectedSide === 'top') {
                    newMetrics.yOrigin += +this.metricsInput * direction * -1;
                }
                break;
        }
        if (
            direction === -1 &&
            !this.allowResizing(this.selectedSide, newMetrics)
        ) {
            this.$toasted.error(
                'Cannot resize scroll because artefacts will be cropped',
                { duration: 3000 }
            );
        } else {
            const metricsOperation = new EditionMetricOperation(
                this.edition.id,
                this.edition.metrics,
                newMetrics
            );
            this.edition.metrics = { ...newMetrics };
            this.newOperation(metricsOperation);
            this.$emit('onMetricsChange');
        }
    }
    private allowResizing(
        side: string,
        newMetrics: EditionManuscriptMetricsDTO
    ): boolean {
        // left : XOrigin <= Xmin
        if (side === 'left') {
            const minX =
                Math.min(
                    ...this.placedArtefacts.map(
                        (art) => art.placement.translate.x!
                    )
                ) / this.edition.ppm;
            return newMetrics.xOrigin <= minX;
        }

        // right : Xmax <= width
        if (side === 'right') {
            const maxX =
                Math.max(
                    ...this.placedArtefacts.map(
                        (art) =>
                            art.placement.translate.x! + art.boundingBox.width
                    )
                ) / this.edition.ppm;
            return maxX - newMetrics.xOrigin <= newMetrics.width;
        }

        // top : YOrigin <= Ymin
        if (side === 'top') {
            const minY =
                Math.min(
                    ...this.placedArtefacts.map(
                        (art) => art.placement.translate.y!
                    )
                ) / this.edition.ppm;
            return newMetrics.yOrigin <= minY;
        }

        // down : Ymax <= height
        if (side === 'down') {
            const maxY =
                Math.max(
                    ...this.placedArtefacts.map(
                        (art) =>
                            art.placement.translate.y! + art.boundingBox.height
                    )
                ) / this.edition.ppm;
            return maxY - newMetrics.yOrigin <= newMetrics.height;
        }

        return true;
    }

    private saveGroupArtefacts() {
        const group = this.edition.artefactGroups.find(
            (x) => x.groupId === this.selectedGroup!.groupId
        );
        this.operationsManager.addOperation(
            new EditGroupOperation(
                this.selectedGroup!.groupId,
                group ? group.artefactIds : [],
                this.selectedGroup!.artefactIds
            )
        );
        if (group) {
            if (
                !this.selectedGroup!.artefactIds ||
                this.selectedGroup!.artefactIds.length < 2
            ) {
                this.deleteGroup(group.groupId);
                this.cancelGroup();
            } else {
                group.artefactIds = [...this.selectedGroup!.artefactIds];
                this.params.mode = '';
            }
        } else {
            this.edition!.artefactGroups.push(this.selectedGroup!.clone());
            this.params.mode = '';
        }
    }

    private deleteGroup(groupId: number) {
        const groupArtefact = this.edition.artefactGroups.find(
            (x) => x.groupId === groupId
        );
        if (groupArtefact) {
            groupArtefact.artefactIds = [];
        }
    }

    private cancelGroup() {
        this.selectGroup(undefined);
        this.params.mode = '';
    }

    private openAddArtefactModal() {
        this.$root.$emit('bv::show::modal', 'addArtefactModal');
    }

    private newOperation(operation: ScrollEditorOperation) {
        this.operationsManager.addOperation(operation);
    }

    private removeArtefactOrGroup() {
        let operation: ScrollEditorOperation = {} as ScrollEditorOperation;

        if (this.selectedArtefact) {
            operation = this.createOperation(
                'delete',
                Placement.empty,
                this.selectedArtefact,
                false
            );
        }
        if (this.selectedGroup) {
            const operations: ScrollEditorOperation[] = [];

            this.selectedArtefacts.forEach((art: Artefact) => {
                operations.push(
                    this.createOperation('delete', Placement.empty, art, false)
                );
            });

            operation = new GroupPlacementOperation(
                this.selectedGroup.groupId,
                operations,
                'delete'
            );
        }

        this.newOperation(operation);

        if (this.selectedGroup) {
            this.deleteGroup(this.selectedGroup.groupId);
        }
    }

    private onDisplayROIs(value: boolean) {
        this.scrollEditorState.displayRois = value;
    }
    private onDisplayReconstructedText(value: boolean) {
        this.scrollEditorState.displayReconstructedText = value;
    }
    private onDisplayText(value: boolean) {
        this.scrollEditorState.displayText = value;
    }
}
</script>

<style lang="scss" scoped>
@import '@/assets/styles/_variables.scss';
@import '@/assets/styles/_fonts.scss';

.header-actions {
    background-color: $white;
}
.editor-container {
    background-color: $white;
    margin-right: 1%;
    margin-left: 1%;
    height: calc(100vh - 180px);
}
#artefact-container {
    position: relative;
    overflow: auto;
    padding: 0;
    height: calc(100vh - 249px);
    touch-action: none;
}
#artefact-container.active {
    width: calc(100vw - 42px);
}
.artefact-container {
    position: relative;
    height: calc(100vh - 63px);
    width: calc(100vw - 290px);
}

/* .input-lg {
    width: 50% !important;
    max-width: 75px;
} */
</style>