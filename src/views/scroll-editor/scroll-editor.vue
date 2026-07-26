<template>
    <div>
        <div v-if="waiting" class="col">
            <Waiting></Waiting>
        </div>
        <div v-if="!waiting" tabindex="0" @keydown="onKeyDown" @keyup="onKeyUp" v-on:keypress="onKeyPress">
            <div class="editor-shell mb-1 border-bottom">
                <!-- Toolbar lives ABOVE the grid (as a natural-height flex item), not in a
                     fixed grid row, so when its controls wrap at ~1280–1440 the bar grows
                     instead of spilling onto the canvas. The grid below fills the rest. -->
                <scroll-top-toolbar
                    ref="topToolbar"
                    id="toolbar"
                    v-model="params.zoom"
                    @new-operation="newOperation($event)"
                    @zoomChangedGlobal="onZoomChangedGlobal($event)"
                />

                <div id="editor-grid" ref="editorGrid">
                <div id="artefact-row" no-gutters>
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
                            ref="scrollArea"
                            @onSelectArtefact="selectArtefact($event)"
                            @onSaveGroupArtefacts="saveGroupArtefacts()"
                            @new-operation="newOperation($event)"
                            @onCancelGroup="cancelGroup()"
                        ></scroll-area>
                    </div>
                </div>

                <resize-bar
                    v-if="$refs.editorGrid"
                    :gridElement="$refs.editorGrid"
                    storageKey="scroll-editor-left-pane-width"
                ></resize-bar>
                <div
                    class="border-end"
                    ref="artefactSidebar"
                    id="scroll-map-container"
                >
                    <div ref="scrollMap">
                        <scroll-map @navigate-to-point="navigateToPoint" />
                    </div>
                    <div
                        class="pt-3"
                        id="secondary-toolbar"
                        :style="{ height: secondaryToolbarHeight + 'px' }"
                    >
                        <text-toolbar
                            v-if="isTextMode"
                            @text-changed="onTextChanged($event)"
                            d-flex
                            m-auto
                            p-auto
                            adjust-content-center
                            align-items-center
                        ></text-toolbar>

                        <manuscript-toolbar
                            v-else
                            @new-operation="newOperation($event)"
                            @save-group="saveGroupArtefacts()"
                            @cancel-group="cancelGroup()"
                        ></manuscript-toolbar>
                    </div>
                </div>
                </div>

                <add-artefact-modal></add-artefact-modal>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import { currentState } from '@/state/current';
import EditionIcons from '@/components/cues/edition-icons.vue';
import ResizeBar from '@/components/misc/resizeBar.vue';
import Waiting from '@/components/misc/Waiting.vue';
import Zoomer from '@/components/misc/zoomer.vue';
import { EditionManuscriptMetricsDTO } from '@/dtos/sqe-dtos';
import { Artefact } from '@/models/artefact';
import ArtefactService from '@/services/artefact';
import EditionService from '@/services/edition';
import { VirtualArtefactEditor } from '@/services/virtual-artefact';
import { ScrollEditorState } from '@/state/scroll-editor';
import { BoundingBox, Point } from '@/utils/helpers';
import { OperationsManager, SavingAgent } from '@/utils/operations-manager';
import { Placement } from '@/utils/Placement';
import { Component, Vue, toNative } from 'vue-facing-decorator';
import { showModal } from '@/utils/modal-bus';
import { ArtefactGroup } from '../../models/edition';
import { ArtefactEditorOperation } from '../artefact-editor/operations';
import { ScrollEditorParams } from '../artefact-editor/types';
import { EditorParamsChangedArgs } from '../imaged-object-editor/types';
import AddArtefactModal from './add-artefact-modal.vue';
import ManuscriptToolbar from './manuscript-toolbar.vue';
import {
    ArtefactPlacementOperation,
    ArtefactPlacementOperationType,
    EditGroupOperation,
    EditionMetricOperation,
    GroupPlacementOperation,
    ScrollEditorOperation,
} from './operations';
import ScrollArea from './scroll-area.vue';
import ScrollMap from './scroll-map.vue';
import ScrollRuler from './scroll-ruler.vue';
import ScrollTopToolbar from './scroll-top-toolbar.vue';
import TextToolbar from './text-toolbar.vue';

@Component({
    name: 'scroll-editor',
    components: {
        Waiting,
        zoomer: Zoomer,
        'add-artefact-modal': AddArtefactModal,
        'edition-icons': EditionIcons,
        'scroll-area': ScrollArea,
        'scroll-ruler': ScrollRuler,
        'scroll-map': ScrollMap,
        'scroll-top-toolbar': ScrollTopToolbar,
        'manuscript-toolbar': ManuscriptToolbar,
        'text-toolbar': TextToolbar,
        'resize-bar': ResizeBar,
    },
})
class ScrollEditor
    extends Vue
    implements SavingAgent<ScrollEditorOperation> {
    public operationsManager = new OperationsManager<
        ScrollEditorOperation | ArtefactEditorOperation
    >(this);
    public waiting: boolean = true;
    public editionId: number = 0;
    public observer?: ResizeObserver;
    public editionService = new EditionService();

    public selectedSide: string = 'left';
    public metricsInput: number = 1;
    public secondaryToolbarHeight: number = 100;
    //

    public get scrollEditorState(): ScrollEditorState {
        return currentState().scrollEditor;
    }
    public get selectedArtefacts() {
        return this.scrollEditorState.selectedArtefacts;
    }
    public get selectedArtefact() {
        return this.scrollEditorState.selectedArtefact;
    }
    public get selectedGroup() {
        return this.scrollEditorState.selectedGroup;
    }
    public get params(): ScrollEditorParams {
        return this.scrollEditorState.params || new ScrollEditorParams();
    }
    public get edition() {
        return currentState().editions.current! || {};
    }
    public get editionWidth(): number {
        return this.edition.metrics.width;
    }
    public get editionHeight(): number {
        return this.edition.metrics.height;
    }

    public get isTextMode(): boolean {
        return this.scrollEditorState.mode === 'text';
    }

    public get viewportSizeWidth() {
        return Math.round(
            this.scrollEditorState.viewport!.width / this.edition.ppm
        );
    }
    public get viewportSizeHeight() {
        return Math.round(
            this.scrollEditorState.viewport!.height / this.edition.ppm
        );
    }
    public get actualWidth(): number {
        return this.edition.metrics.width * this.edition.ppm * this.zoomLevel;
    }
    public get actualHeight(): number {
        return this.edition.metrics.height * this.edition.ppm * this.zoomLevel;
    }

    public get zoomLevel() {
        return (this.params && this.params.zoom) || 1;
    }

    public get pointerPositionX() {
        return (
            this.scrollEditorState.pointerPosition.x /
            this.params.zoom /
            this.edition.ppm
        ).toFixed(2);
    }
    public get pointerPositionY() {
        return (
            this.scrollEditorState.pointerPosition.y /
            this.params.zoom /
            this.edition.ppm
        ).toFixed(2);
    }

    public async saveEntities(ops: ScrollEditorOperation[]): Promise<boolean> {
        // The OperationsManager autosave calls this on a detached saving-agent `this` whose
        // reactive `editionId` field can still be its `= 0` default (the same context problem
        // the imaged-object editor documents — `this` is not the live component here). Resolve
        // the edition from the store instead, so the save targets the real edition and not 0.
        const editionId = currentState().editions.current?.id || this.editionId;

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
                if (op.type === 'delete' && op.groupId >= 0) {
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
                (artId) => currentState().artefacts.find(artId)!
            );
            allMovedArtefacts.forEach((art) => art.prepareForBackend());
            //            console.debug('Artefacts after preparing for backend ', allMovedArtefacts.map(art => JSON.stringify(art.placement)));

            if (allMovedArtefacts) {
                await this.editionService.updateArtefactDTOs(
                    editionId,
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
                            const savedGroup =
                                await this.editionService.newArtefactGroup(
                                    editionId,
                                    group
                                );
                            group.groupId = savedGroup.id;
                            this.updateOperationId(groupId, savedGroup.id);
                            this.selectGroup(group);
                        }
                        // Save edited group with length > 1
                    } else if (group.id > 0) {
                        if (group.artefactIds.length >= 2) {
                            const savedGroup =
                                await this.editionService.updateArtefactGroup(
                                    editionId,
                                    group
                                );
                        } else {
                            await this.editionService.deleteArtefactGroup(
                                editionId,
                                groupId
                            );
                        }
                    }
                });
            }

            // delete groups
            allDeletedGroupIds.forEach(async (groupId) => {
                await this.editionService.deleteArtefactGroup(
                    editionId,
                    groupId
                );
            });

            // save metrics
            if (saveMetrics) {
                await this.editionService.updateMetrics(
                    editionId,
                    this.edition.metrics
                );
            }

            return true;
        } catch (error: any) {
            console.error(error);
            // TODO(vue3): $toasted was removed; replace with a Vue 3 notification plugin
            return false;
        }
    }

    public get artefacts() {
        return currentState().artefacts.items || [];
    }
    public get placedArtefacts() {
        return this.artefacts.filter((x) => x.isPlaced);
    }

    public created() {
        currentState().eventBus.on('select-group', this.selectGroup);
        currentState().eventBus.on('save-group', this.saveGroupArtefacts);
        currentState().eventBus.on('delete-group', this.deleteGroup);
        currentState().eventBus.on('update-operation-id', this.updateOperationId);
        currentState().eventBus.on('new-operation', this.onNewOperation);
        currentState().eventBus.on(
            'new-bulk-operations',
            this.onNewBulkOperations
        );
        this.observer = new ResizeObserver((entries) => this.onResize(entries));

        // Moved to created() to avoid unclear material or text mode
        currentState().scrollEditor = new ScrollEditorState();
    }

    public unmounted() {
        currentState().eventBus.off('select-group', this.selectGroup);
        currentState().eventBus.off('save-group', this.saveGroupArtefacts);
        currentState().eventBus.off('delete-group', this.deleteGroup);
        currentState().eventBus.off('update-operation-id', this.updateOperationId);
        currentState().eventBus.off('new-operation', this.onNewOperation);
        currentState().eventBus.off(
            'new-bulk-operations',
            this.onNewBulkOperations
        );

        if (this.observer) {
            this.observer.disconnect();
        }

        // Cancel any pending autosave so it can't fire against this torn-down editor.
        this.operationsManager.dispose();
        currentState().operationsManager = null;
    }

    public async mounted() {
        this.waiting = true;
        // This code is not in the created method since it's asynchronous, and Vue doesn't wait for
        // an asynchornous created to finish before calling mounted. Instead of adding a synchronization
        // between created and mounted, we just moved it to mounted.
        this.editionId = parseInt(String(this.$route.params.editionId), 10);
        await currentState().prepare.edition(this.editionId);
        await currentState().prepare.editionFullText(this.editionId);
        // Imaged objects are loaded lazily (not on edition open); the scroll editor
        // needs them for adding/copying artefacts.
        await currentState().prepare.imagedObjects(this.editionId);
        // The scroll layout (viewBox / bounds) is derived from every placed
        // artefact's mask bounding box, so ensure their masks are loaded up front.
        await currentState().prepare.ensureArtefactMasks(this.placedArtefacts);

        const edition = currentState().editions.find(this.editionId); // Set the current scroll
        if (!edition) {
            this.$router.push({ path: '/' });
        }
        currentState().editions.current = edition;
        currentState().artefacts.current = null;
        currentState().imagedObjects.current = null;
        this.waiting = false;
        await this.$nextTick();
        // TODO(vue3): bv::modal::hide event bus is not available in Vue 3; replace with a boolean v-model prop on add-artefact-modal and listen to @hide or @update:model-value
        // this.$root.$on('bv::modal::hide', (bvEvent: any, modalId: any) => {
        //     if (modalId === 'addArtefactModal') {
        //         const artefactIds = bvEvent.trigger;
        //         this.onAddArtefactModalClose(artefactIds);
        //     }
        // });

        this.observer!.observe(this.$refs.artefactContainer as Element);
        this.observer!.observe(this.$refs.artefactSidebar as Element);
        this.onResize([]);
        currentState().operationsManager = this.operationsManager;
        currentState().textFragmentEditor.textEditingMode = 'manuscript';
    }

    public async beforeRouteUpdate(to: any, from: any, next: () => void) {
        this.editionId = parseInt(to.params.editionId, 10);
        await currentState().prepare.edition(this.editionId);
        await currentState().prepare.editionFullText(this.editionId);
        next();
    }

    public onMetricsChange() {
        this.calculateViewport();
    }

    public onNewOperation(op: ArtefactEditorOperation) {
        this.operationsManager.addOperation(op);
    }

    public onNewBulkOperations(ops: ArtefactEditorOperation[]) {
        this.operationsManager.addBulkOperations(ops);
    }

    public async onAddArtefactModalClose(artIds: number[]) {
        const artefacts = currentState().artefacts.items.filter((art: Artefact) =>
            artIds.includes(art.id)
        );
        if (artefacts) {
            const orderedArtefacts = this.artefacts
                .filter((x) => x.isPlaced)
                .map((x) => x.placement.zIndex);
            const maxZindex = orderedArtefacts.length
                ? Math.max(...orderedArtefacts)
                : 0;

            // Place close to topleft corner of viewport
            // const placement = new Placement({
            //     translate: {
            //         x: (currentState().scrollEditor.viewport?.x || 0) + 50,
            //         y: (currentState().scrollEditor.viewport?.y || 0) + 50,
            //     },
            //     scale: 1,
            //     rotate: 0,
            //     zIndex: maxZindex + 1,
            //     mirrored: false,
            // });

            artefacts.forEach((art: Artefact, index: number) => {
                const placement = new Placement({
                    translate: {
                        x:
                            (currentState().scrollEditor.viewport?.x || 0) +
                            50 +
                            index * 500,
                        y: (currentState().scrollEditor.viewport?.y || 0) + 50,
                    },
                    scale: 1,
                    rotate: 0,
                    zIndex: maxZindex + 1 + index,
                    mirrored: false,
                });

                const operation = new ArtefactPlacementOperation(
                    art.id,
                    'add',
                    Placement.empty,
                    placement,
                    art.isPlaced,
                    true
                );
                art.placeOnScroll(placement);

                // load artefact Rois
                /*
            No need, ROIs were already loaded
            await Promise.all(
                artefact.textFragments.map((tf: ArtefactTextFragmentData) => {
                    currentState().prepare.textFragment(artefact.editionId, tf.id);
                })
            ); */

                this.newOperation(operation);
            });

            this.selectArtefact(artefacts[0]);
        }
    }

    public notifyChange(paramName: string, paramValue: any) {
        const args = {
            property: paramName,
            value: paramValue,
            params: this.params,
        } as unknown as EditorParamsChangedArgs; // TODO: Change this to the right type
        this.$emit('paramsChanged', args);
    }

    public onZoomChangedGlobal(val: number) {
        this.params.zoom = val; //
        this.calculateViewport();
    }

    public selectArtefact(artefact: Artefact | undefined) {
        if (!artefact) {
            this.selectGroup(undefined);
        }

        const existingGroup = this.edition!.artefactGroups.find(
            (x) => artefact && x.artefactIds.includes(artefact.id)
        );

        if (this.params.mode === 'manageGroup' || this.params.mode === 'multipleSelect') {
            if (!this.selectedGroup) {
                const newGroup = ArtefactGroup.generateGroup(
                    this.selectedArtefact ? [this.selectedArtefact!.id] : [],
                    this.params.mode === 'multipleSelect' ? true : false
                );
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

    public onResize(entries: ResizeObserverEntry[]) {
        this.calculateViewport();
        this.calculateSecondaryToolbarHeight();
    }

    public onScroll() {
        this.calculateViewport();
    }

    public calculateViewport() {
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
        // Vue.set(currentState().scrollEditor, 'viewport', viewport);
        currentState().scrollEditor.viewport = viewport;
    }

    public calculateSecondaryToolbarHeight() {
        // Set the height of the secondary toolbar to the artefactSidebar height, minus the scrollmap's height.
        // We must set the height explicitly, otherwise the vertical scrollbar on the secondary toolbar misbehaves
        const artefactsContainer = this.$refs.artefactContainer as Element;
        const artefactsContainerHeight =
            artefactsContainer.getBoundingClientRect().height;
        const scrollmap = this.$refs.scrollMap as Element;
        const scrollmapHeight = scrollmap.getBoundingClientRect().height;

        const height = artefactsContainerHeight - scrollmapHeight;

        this.secondaryToolbarHeight = height;
    }

    public updateOperationId(oldId: number, newId: number) {
        this.operationsManager.updateStackIds(oldId, newId);
    }

    public createOperation(
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

    public navigateToPoint(pt: Point) {
        const div = this.$refs.artefactContainer as Element;
        const viewport = currentState().scrollEditor.viewport;
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

    public resizeScroll(direction: number) {
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
            // TODO(vue3): $toasted was removed; replace with a Vue 3 notification plugin
            console.error('Cannot resize scroll because artefacts will be cropped');
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
    public allowResizing(
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

    //

    public selectGroup(group: ArtefactGroup | undefined) {
        this.scrollEditorState.selectGroup(group);
    }

    public saveGroupArtefacts() {
        if (this.selectedGroup === null) {
            console.warn('Cannot save null group');
            return;
        }

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
        } else if (!this.selectedGroup.notSave) {
            this.edition!.artefactGroups.push(this.selectedGroup!.clone());
            this.params.mode = '';
        }
    }

    public deleteGroup(groupId: number) {
        const groupArtefact = this.edition.artefactGroups.find(
            (x) => x.groupId === groupId
        );
        if (groupArtefact) {
            groupArtefact.artefactIds = [];
        }
    }

    public cancelGroup() {
        this.selectGroup(undefined);
        this.params.mode = '';
    }

    public openAddArtefactModal() {
        showModal('addArtefactModal');
    }

    public newOperation(operation: ScrollEditorOperation) {
        this.operationsManager.addOperation(operation);
    }

    public async onTextChanged(params: {
        text: string;
        editor: VirtualArtefactEditor;
    }) {
        const editedArtefact =
            currentState().textFragmentEditor.editedVirtualArtefact;

        if (!editedArtefact) {
            console.error(
                "Can't save text changed, $state.textFragmentEditor.editedVirtualArtefact is not set"
            );
            return;
        }

        if (!editedArtefact?.isVirtual) {
            console.error("Can't save text change of a non-virtual artefact");
            return;
        }

        if (!editedArtefact.signInterpretations.length) {
            console.error(
                "Can't save text of a virtual artefact with no sign interpretations"
            );
        }
        const line = editedArtefact.signInterpretations[0].sign.line;

        params.editor.updateText();
    }

    public onKeyDown(event: KeyboardEvent) {
        if (this.scrollEditorState.selectedArtefacts.length) {
            (this.$refs.topToolbar as unknown as { onKeyDown(e: KeyboardEvent): void }).onKeyDown(event);
        } else {
            const el = this.$refs.artefactContainer as Element;
            const amount = 30;
            switch (event.key) {
                case 'ArrowDown':
                    el.scrollTop += amount;
                    break;
                case 'PageDown':
                    el.scrollTop += amount * 3;
                    break;
                case 'ArrowUp':
                    el.scrollTop -= amount;
                    break;
                case 'PageUp':
                    el.scrollTop -= amount * 3;
                    break;
                case 'ArrowLeft':
                    el.scrollLeft -= amount;
                    break;
                case 'ArrowRight':
                    el.scrollLeft += amount;
                    break;
                case 'Home':
                    el.scrollTo(0, 0);
                    break;
                case 'End':
                    el.scrollTo(el.scrollWidth, el.scrollHeight);
                    break;
                default:
                    break;
            }
        }
        if (event.key === 'Delete') {
            // TODO(vue3): $root.$emit is removed in Vue 3; replace with a shared event bus or Pinia action
            this.$root!.$emit('delete-key-pressed');
        }
    }

    public onKeyPress(event: KeyboardEvent) {
         if (event.key === 'g') {
            console.log('ctrl');
            this.params.mode = 'multipleSelect';
        }
    }
    public onKeyUp(event: KeyboardEvent) {
        if (event.key === 'g') {
            this.params.mode = '';
        }
    }
}
export default toNative(ScrollEditor);
</script>

<style lang="scss" scoped>
@import '@/assets/styles/_variables.scss';
@import '@/assets/styles/_fonts.scss';
@import '@/assets/styles/_classes.scss';

.header-actions {
    background-color: $white;
}

// Flex column: the toolbar takes its natural (possibly wrapped) height, the grid fills
// the rest. This replaces the old fixed-height toolbar grid row that clipped wrapped
// controls and spilled them onto the canvas.
.editor-shell {
    @extend .editor;
    display: flex;
    flex-direction: column;
}
#toolbar {
    // Keep the toolbar at its natural (possibly wrapped) height. Without flex-shrink:0 the
    // flex column shrinks it down to its 70px min-height to make room for the grid's tall
    // canvas content, re-clipping the wrapped controls.
    flex: 0 0 auto;
}
#editor-grid {
    display: grid;
    grid-template-columns: 70% 1fr 30%;
    grid-template-rows: 1fr;
    flex: 1 1 auto;
    min-height: 0; // allow the grid to shrink within the flex column
}
#artefact-row {
    grid-column: 1 / 3;
    grid-row: 1 / 2;
}

#artefact-container {
    position: relative;
    overflow: auto;
    padding: 0;
    // Fill the grid cell (the space left below the natural-height toolbar) rather than a
    // fixed calc that assumed a one-row 74px toolbar.
    height: 100%;
    touch-action: none;
}
#scroll-map-container {
    grid-column: 3 / 3;
    grid-row: 1 / 2;
}
#artefact-container.active {
    width: calc(100vw - 42px);
}

.scroll-editor-col {
    position: relative;
    height: 100%;
}

#secondary-toolbar {
    height: 500px;
    overflow-x: hidden;
    overflow-y: auto;
}
</style>