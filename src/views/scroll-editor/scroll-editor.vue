<template>
    <div>
        <div v-if="waiting" class="col">
            <Waiting></Waiting>
        </div>
        <div v-if="!waiting" tabindex="0" @keydown="onKeyDown" @keyup="onKeyUp" v-on:keypress="onKeyPress">
            <div id="editor-grid" ref="editorGrid" class="mb-1 border-bottom">
                <scroll-top-toolbar
                    ref="topToolbar"
                    id="toolbar"
                    v-model="params.zoom"
                    @new-operation="newOperation($event)"
                    @zoomChangedGlobal="onZoomChangedGlobal($event)"
                />

                <div id="artefact-row" no-gutters>
                    <div
                        id="artefact-container"
                        ref="artefactContainer"
                        @keyup="checkCtrlRelease($event)"
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
                    class="border-right"
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

                <add-artefact-modal></add-artefact-modal>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
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
import { Component, Vue } from 'vue-property-decorator';
import { ArtefactGroup } from '../../models/edition';
import { ArtefactEditorOperation } from '../artefact-editor/operations';
import { ScrollEditorParams } from '../artefact-editor/types';
import { EditorParamsChangedArgs } from '../imaged-object-editor/types';
import AddArtefactModal from './add-artefact-modal.vue';
import ArtefactToolbox from './artefact-toolbox.vue'; // TBD
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
        'artefact-toolbox': ArtefactToolbox, // TBD
        'scroll-area': ScrollArea,
        'scroll-ruler': ScrollRuler,
        'scroll-map': ScrollMap,
        'scroll-top-toolbar': ScrollTopToolbar,
        'manuscript-toolbar': ManuscriptToolbar,
        'text-toolbar': TextToolbar,
        'resize-bar': ResizeBar,
    },
})
export default class ScrollEditor
    extends Vue
    implements SavingAgent<ScrollEditorOperation>
{
    private operationsManager = new OperationsManager<
        ScrollEditorOperation | ArtefactEditorOperation
    >(this);
    protected waiting: boolean = true;
    private editionId: number = 0;
    private observer?: ResizeObserver;
    private editionService = new EditionService();

    private selectedSide: string = 'left';
    private metricsInput: number = 1;
    protected secondaryToolbarHeight: number = 100;
    //

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

    private get isTextMode(): boolean {
        return this.scrollEditorState.mode === 'text';
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
            //            console.debug('Artefacts after preparing for backend ', allMovedArtefacts.map(art => JSON.stringify(art.placement)));

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
                            const savedGroup =
                                await this.editionService.newArtefactGroup(
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
                            const savedGroup =
                                await this.editionService.updateArtefactGroup(
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
        } catch (error: any) {
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
        this.$state.eventBus.on('new-operation', this.onNewOperation);
        this.$state.eventBus.on(
            'new-bulk-operations',
            this.onNewBulkOperations
        );
        this.observer = new ResizeObserver((entries) => this.onResize(entries));

        // Moved to created() to avoid unclear material or text mode
        this.$state.scrollEditor = new ScrollEditorState();
    }

    protected destroyed() {
        this.$state.eventBus.off('select-group', this.selectGroup);
        this.$state.eventBus.off('save-group', this.saveGroupArtefacts);
        this.$state.eventBus.off('delete-group', this.deleteGroup);
        this.$state.eventBus.off('update-operation-id', this.updateOperationId);
        this.$state.eventBus.off('new-operation', this.onNewOperation);
        this.$state.eventBus.off(
            'new-bulk-operations',
            this.onNewBulkOperations
        );

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
        await this.$state.prepare.editionFullText(this.editionId);

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
                const artefactIds = bvEvent.trigger;
                this.onAddArtefactModalClose(artefactIds);
            }
        });

        this.observer!.observe(this.$refs.artefactContainer as Element);
        this.observer!.observe(this.$refs.artefactSidebar as Element);
        this.onResize([]);
        this.$state.operationsManager = this.operationsManager;
        this.$state.textFragmentEditor.textEditingMode = 'manuscript';
    }

    private async beforeRouteUpdate(to: any, from: any, next: () => void) {
        this.editionId = parseInt(to.params.editionId, 10);
        await this.$state.prepare.edition(this.editionId);
        await this.$state.prepare.editionFullText(this.editionId);
        next();
    }

    private onMetricsChange() {
        this.calculateViewport();
    }

    private onNewOperation(op: ArtefactEditorOperation) {
        this.operationsManager.addOperation(op);
    }

    private onNewBulkOperations(ops: ArtefactEditorOperation[]) {
        this.operationsManager.addBulkOperations(ops);
    }

    private async onAddArtefactModalClose(artIds: number[]) {
        const artefacts = this.$state.artefacts.items.filter((art: Artefact) =>
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
            //         x: (this.$state.scrollEditor.viewport?.x || 0) + 50,
            //         y: (this.$state.scrollEditor.viewport?.y || 0) + 50,
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
                            (this.$state.scrollEditor.viewport?.x || 0) +
                            50 +
                            index * 500,
                        y: (this.$state.scrollEditor.viewport?.y || 0) + 50,
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
                    this.$state.prepare.textFragment(artefact.editionId, tf.id);
                })
            ); */

                this.newOperation(operation);
            });

            this.selectArtefact(artefacts[0]);
        }
    }

    private notifyChange(paramName: string, paramValue: any) {
        const args = {
            property: paramName,
            value: paramValue,
            params: this.params,
        } as unknown as EditorParamsChangedArgs; // TODO: Change this to the right type
        this.$emit('paramsChanged', args);
    }

    private onZoomChangedGlobal(val: number) {
        this.params.zoom = val; //
        this.calculateViewport();
    }

    private selectArtefact(artefact: Artefact | undefined) {
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

    private onResize(entries: ResizeObserverEntry[]) {
        this.calculateViewport();
        this.calculateSecondaryToolbarHeight();
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

    private calculateSecondaryToolbarHeight() {
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

    //

    private selectGroup(group: ArtefactGroup | undefined) {
        this.scrollEditorState.selectGroup(group);
    }

    private saveGroupArtefacts() {
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

    private async onTextChanged(params: {
        text: string;
        editor: VirtualArtefactEditor;
    }) {
        const editedArtefact =
            this.$state.textFragmentEditor.editedVirtualArtefact;

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

    protected onKeyDown(event: KeyboardEvent) {
       
        if (this.scrollEditorState.selectedArtefacts.length) {
            (this.$refs.topToolbar as ScrollTopToolbar).onKeyDown(event);
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
            this.$root.$emit('delete-key-pressed');
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
</script>

<style lang="scss" scoped>
@import '@/assets/styles/_variables.scss';
@import '@/assets/styles/_fonts.scss';
@import '@/assets/styles/_classes.scss';

.header-actions {
    background-color: $white;
}

#editor-grid {
    @extend .editor;
    display: grid;

    grid-template-columns: 70% 1fr 30%;
    grid-template-rows: $toolbar-height 1fr;
}
#toolbar {
    grid-column: 1 / span 3;
    grid-row: 1 / 2;
}
#artefact-row {
    grid-column: 1 / 3;
    grid-row: 2 / 2;
}

#artefact-container {
    position: relative;
    overflow: auto;
    padding: 0;
    height: calc(100vh - 169px);
    /* height: calc(100vh - 249px); */
    touch-action: none;
}
#scroll-map-container {
    grid-column: 3 / 3;
    grid-row: 2 / 2;
}
#artefact-container.active {
    width: calc(100vw - 42px);
}

.scroll-editor-col {
    position: relative;
    height: calc(100vh - 169px);
}

#secondary-toolbar {
    height: 500px;
    overflow-x: hidden;
    overflow-y: auto;
}
</style>