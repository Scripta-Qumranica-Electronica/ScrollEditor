<template>
    <div class="wrapper" id="scroll-editor" v-if="ready">
        <div
            id="sidebar"
            class="imaged-object-menu-div col-xl-2 col-lg-3 col-md-4"
            :class="{ active : isActive }"
        >
            <scroll-menu
                :status-indicator="operationsManager"
                @new-operation="onNewOperation($event)"
                @undo="onUndo()"
                @redo="onRedo()"
                @onCancelGroup="cancelGroup()"
                @onSaveGroupArtefacts="saveGroupArtefacts()"
                @onDeleteGroup="deleteGroup($event)"
                @metricsChange="onMetricsChange()"
                @zoomChanged="onZoomChanged()"
                @navigate-to-point="onNavigateToPoint"
            ></scroll-menu>
        </div>
        <div class="container col-xl-12 col-lg-12 col-md-12">
            <div class="row">
                <div id="buttons-div">
                    <b-button
                        type="button"
                        class="sidebarCollapse"
                        @click="sidebarClicked()"
                        v-b-tooltip.hover.bottom
                        :title="$t('misc.collapsedsidebarObject')"
                    >
                        <i class="fa fa-align-justify"></i>
                    </b-button>
                </div>

    
                
                <div id="artefact-container" ref="artefactContainer" @scroll="onScroll" :class="{active: isActive}">
                   <!-- artefact: {{selectedArtefact && selectedArtefact.id}}
                    group: {{selectedGroup}} -->
                    <scroll-area
                        ref="scrollAreaRef"
                        @onSelectArtefact="selectArtefact($event)"
                        @onSaveGroupArtefacts="saveGroupArtefacts()"
                        @new-operation="onNewOperation($event)"
                        @onCancelGroup="cancelGroup()"
                    ></scroll-area>
                </div>
            </div>
        </div>
    </div>
</template>


<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import Waiting from '@/components/misc/Waiting.vue';
import { Artefact } from '@/models/artefact';
import ScrollMenu from './scroll-menu.vue';
import ScrollArea from './scroll-area.vue';
import { ScrollEditorParams } from '../artefact-editor/types';
import ArtefactService from '@/services/artefact';
import { OperationsManager, SavingAgent } from '@/utils/operations-manager';
import {
    ScrollEditorOperation,
    ArtefactPlacementOperation,
    GroupPlacementOperation,
    EditGroupOperation,
    EditionMetricOperation
} from './operations';
import EditionService from '@/services/edition';
import { Placement } from '@/utils/Placement';
import { ArtefactGroup } from '../../models/edition';
import { ScrollEditorState } from '../../state/scroll-editor';
import { BoundingBox, Point } from '../../utils/helpers';

@Component({
    name: 'scroll-editor',
    components: {
        Waiting,
        'scroll-menu': ScrollMenu,
        'scroll-area': ScrollArea
    }
})
export default class ScrollEditor extends Vue
    implements SavingAgent<ScrollEditorOperation> {
    // private artefact: Artefact | undefined = {} as Artefact;
    private isActive = false;
    private ready = false;
    private metricsHasChanged: boolean = false;
    private editionId: number = 0;
    private artefactService = new ArtefactService();
    private editionService = new EditionService();
    private observer?: ResizeObserver;
    private operationsManager = new OperationsManager<ScrollEditorOperation>(
        this
    );

    public get scrollEditorState(): ScrollEditorState {
        return this.$state.scrollEditor;
    }

    public get selectedGroup() {
        return this.scrollEditorState.selectedGroup;
    }

    public get selectedArtefact() {
        return this.scrollEditorState.selectedArtefact;
    }

    public selectGroup(group: ArtefactGroup | undefined) {
        this.scrollEditorState.selectGroup(group);
    }

    public selectArtefact(artefact: Artefact | undefined) {
        if (!artefact) {
            this.selectGroup(undefined);
        }

        const existingGroup = this.edition!.artefactGroups.find(
            x => artefact && x.artefactIds.includes(artefact.id)
        );

        if (this.params.mode === 'manageGroup') {
            if (!this.selectedGroup) {
                const newGroup = ArtefactGroup.generateGroup([
                    this.selectedArtefact!.id
                ]);
                this.scrollEditorState.selectGroup(newGroup);
            }

            const isSelectedIndex = this.selectedGroup!.artefactIds.findIndex(
                a => a === artefact!.id
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

    public async saveEntities(ops: ScrollEditorOperation[]): Promise<boolean> {
        const allMovedArtefactIds = new Set<number>();
        const allEditedGroupIds = new Set<number>();
        const allDeletedGroupIds = new Set<number>();
        let saveMetrics = false;

        ops.forEach(op => {
            // Take artefact placements operations
            if (op instanceof ArtefactPlacementOperation) {
                allMovedArtefactIds.add(op.artefactId);
            } else if (op instanceof GroupPlacementOperation) {
                op.operations.forEach(artOp =>
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
                artId => this.$state.artefacts.find(artId)!
            );
            allMovedArtefacts.forEach(art => art.prepareForBackend());

            if (allMovedArtefacts) {
                await this.editionService.updateArtefactDTOs(
                    this.editionId,
                    allMovedArtefacts
                );
            }

            // save groups
            if (allEditedGroupIds.size) {
                allEditedGroupIds.forEach(async groupId => {
                    const group = this.edition.artefactGroups.find(
                        artGroup => artGroup.id === groupId
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
            allDeletedGroupIds.forEach(async groupId => {
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

    protected created() {
        this.$state.eventBus.$on('select-group', this.selectGroup);
        this.$state.eventBus.$on('delete-group', this.deleteGroup);
        this.$state.eventBus.$on('update-operation-id', this.updateOperationId);
        this.observer = new ResizeObserver(entries => this.onResize(entries));
    }

    protected destroyed() {
        this.$state.eventBus.$off('select-group', this.selectGroup);
        this.$state.eventBus.$off('delete-group', this.deleteGroup);
        this.$state.eventBus.$off(
            'update-operation-id',
            this.updateOperationId
        );

        if (this.observer) {
            this.observer.disconnect();
        }
    }

    private sidebarClicked() {
        this.isActive = !this.isActive;
    }

    private async mounted() {
        // This code is not in the created method since it's asynchronous, and Vue doesn't wait for
        // an asynchornous created to finish before calling mounted. Instead of adding a synchronization
        // between created and mounted, we just moved it to mounted.
        this.editionId = parseInt(this.$route.params.editionId, 10);
        await this.$state.prepare.edition(this.editionId);
        this.$state.editions.current = this.$state.editions.find(this.editionId); // Set the current scroll
        // Shaindel - what happens if the scroll doesn't exist (write a wrong ID in the URL and see)
        this.ready = true;

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
    }

    private get artefacts() {
        return this.$state.artefacts.items || [];
    }

    private get edition() {
        if (!this.$state.editions.current) {
            throw new Error("Can't edit a scroll with no current edition");
        }
        return this.$state.editions.current;
    }

    private get placedArtefacts() {
        return this.artefacts.filter(x => x.isPlaced);
    }

    private get params(): ScrollEditorParams {
        return this.scrollEditorState.params || new ScrollEditorParams();
    }

    private async beforeRouteUpdate(to: any, from: any, next: () => void) {
        this.editionId = parseInt(to.params.editionId, 10);
        await this.$state.prepare.edition(this.editionId);
        next();
    }

    private onZoomChanged() {
        this.calculateViewport();
    }

    private updateOperationId(oldId: number, newId: number) {
        this.operationsManager.updateStackIds(oldId, newId);
    }

    private onAddArtefactModalClose(artId: number) {
        const artefact = this.$state.artefacts.find(artId);
        if (artefact) {
            const numberOfPlaced = this.artefacts.filter(x => x.isPlaced)
                .length;

            const orderedArtefacts = this.artefacts
                .filter(x => x.isPlaced)
                .map(x => x.placement.zIndex);
            const maxZindex = orderedArtefacts.length
                ? Math.max(...orderedArtefacts)
                : -1;

            const placement = new Placement({
                translate: {
                    x: 800 * numberOfPlaced,
                    y: 400
                },
                scale: 1,
                rotate: 0,
                zIndex: maxZindex + 1
            });

            artefact.placeOnScroll(placement);
            const operation = new ArtefactPlacementOperation(
                artefact.id,
                'add',
                Placement.empty,
                placement
            );
            this.onNewOperation(operation);
            this.selectArtefact(artefact);
        }
    }

    private saveGroupArtefacts() {
        // Shaindel - what if there is no selected group? Do we get here in case there is no group?
        const group = this.edition.artefactGroups.find(
            x => x.groupId === this.selectedGroup.groupId
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

        }

    }

    private deleteGroup(groupId: number) {
        const groupArtefact = this.edition.artefactGroups.find(
            x => x.groupId === groupId
        );
        if (groupArtefact) {
            groupArtefact.artefactIds = [];
        }
    }

    private onSave() {
        this.operationsManager.save();
    }

    private onNewOperation(op: ScrollEditorOperation) {
        // if (op.type === 'delete') {
        //     this.cancelGroup();
        // }
        this.operationsManager.addOperation(op);
    }

    private onUndo() {
        this.operationsManager.undo();
    }

    private onRedo() {
        this.operationsManager.redo();
    }

    private cancelGroup() {
        this.selectGroup(undefined);
        this.params.mode = '';
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

    private onNavigateToPoint(pt: Point) {
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
}
</script>

<style lang="scss" scoped>
.imaged-object-menu-div {
    height: calc(100vh - 63px);
    overflow: hidden;
}
.sidebarCollapse {
    width: 40px;
    height: 40px;
    display: block;
    margin-bottom: 5px;
}

#scroll-editor {
    overflow: hidden;
    height: calc(100vh - 63px);
}
#buttons-div {
    background-color: #eff1f4;
}
#sidebar {
    min-width: 250px;
    max-width: 250px;
    transition: all 0.6s cubic-bezier(0.945, 0.02, 0.27, 0.665);
    transform-origin: center left; /* Set the transformed position of sidebar to center left side. */
}

#sidebar.active {
    margin-left: -250px;
    transform: rotateY(100deg); /* Rotate sidebar vertically by 100 degrees. */
}

#artefact-container {
    overflow: auto;
    padding: 0;
    height: calc(100vh - 63px);
    width: calc(100vw - 290px);
    touch-action: none;
}
#artefact-container.active{
  width: calc(100vw - 42px);
}
.artefact-container > div {
    height: 100%;
}
.artefact-container.active {
    overflow: auto;
    position: relative;
    padding: 0;
    height: calc(100vh - 63px);
    width: calc(100vw - 40px);
}
.wrapper {
    display: flex;
    align-items: stretch;
    perspective: 1500px;
}
</style>
