<template>
    <div class="wrapper" id="scroll-editor">
        <div
            id="sidebar"
            class="imaged-object-menu-div col-xl-2 col-lg-3 col-md-4"
            :class="{ active : isActive }"
        >
            <scroll-menu
                :artefact="artefact"
                :status-indicator="operationsManager"
                :selectedGroup="selectedGroup"
                @paramsChanged="onParamsChanged($event)"
                @new-operation="onNewOperation($event)"
                @undo="onUndo()"
                @redo="onRedo()"
                @onCancelGroup="cancelGroup()"
                @onSaveGroupArtefacts="saveGroupArtefacts()"
                @onManageGroup="manageGroup()"
                @onDeleteGroup="deleteGroup($event)"
                @metricsChange="onMetricsChange()"
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
                <div class="artefact-container" :class="{active: isActive}">
                    <!-- {{edition.artefactGroups}}
                    {{selectedGroup}} -->
                    <scroll-area v-if="edition"
                        ref="scrollAreaRef"
                        @onSelectArtefact="selectArtefact($event)"
                        @onSaveGroupArtefacts="saveGroupArtefacts()"
                        @onManageGroup="manageGroup()"
                        :params="params"
                        :selectedGroup="selectedGroup"
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
import {
    ArtefactEditorParamsChangedArgs,
    ArtefactEditorParams,
    ScrollEditorParams
} from '../artefact-editor/types';
import ArtefactService from '@/services/artefact';
import { OperationsManager, SavingAgent } from '@/utils/operations-manager';
import {
    ScrollEditorOperation,
    ArtefactPlacementOperation,
    GroupPlacementOperations,
    EditGroupOperation
} from './operations';
import EditionService from '@/services/edition';
import { Placement } from '@/utils/Placement';
import { ArtefactGroup } from '../../models/edition';

@Component({
    name: 'scroll-editor',
    components: {
        Waiting,
        'scroll-menu': ScrollMenu,
        'scroll-area': ScrollArea
    }
})
export default class ScrollEditor extends Vue implements SavingAgent {
    private artefact: Artefact | undefined = {} as Artefact;
    private isActive = false;
    private metricsHasChanged: boolean = false;
    private editionId: number = 0;
    private params: ScrollEditorParams = new ScrollEditorParams();
    private artefactService = new ArtefactService();
    private editionService = new EditionService();
    private selectedGroup: ArtefactGroup = ArtefactGroup.generateGroup([]);
    // Shaindel - what happens if only one artefact is selected?
    private operationsManager = new OperationsManager<
        ScrollEditorOperation | GroupPlacementOperations | EditGroupOperation
    >(this);

    public selectGroup(group: ArtefactGroup) {
        this.selectedGroup = group.clone();
    }
    public onMetricsChange() {
        this.operationsManager.save();
        this.metricsHasChanged = true;
    }
    public selectArtefact(artefact: Artefact | undefined) {
        const existingGroup = this.edition!.artefactGroups.find(
            x => artefact && x.artefactIds.includes(artefact!.id)
        );

        if (this.params.mode === 'manageGroup') {
            const isSelectedIndex = this.selectedGroup.artefactIds.findIndex(
                a => a === artefact!.id
            );

            if (isSelectedIndex > -1) {
                // remove artefact from current group
                this.selectedGroup.artefactIds.splice(isSelectedIndex, 1);
            } else if (
                !existingGroup ||
                (existingGroup && existingGroup.artefactIds.length === 1) ||
                existingGroup.groupId === this.selectedGroup.groupId
            ) {
                // if artefact not in any group or in this group but was unselected
                this.selectedGroup.artefactIds.push(artefact!.id!);
            }
        } else {
            if (existingGroup) {
                // if artefact already in group
                this.selectedGroup.groupId = existingGroup.groupId;
                this.selectedGroup.artefactIds = [...existingGroup.artefactIds];
            }
            // else if (!artefact) {
            // / this.cancelGroup();}
            else {
                this.selectedGroup = ArtefactGroup.generateGroup([
                    artefact!.id!
                ]);
            }
            this.artefact = artefact;
        }
    }

    public async saveEntities(artefactsGroupIds: number[]): Promise<boolean> {
        try {
            let artefactGroup: ArtefactGroup | undefined;
            artefactsGroupIds.forEach(async x => {
                artefactGroup = this.edition!.artefactGroups.find(
                    ag => ag.groupId === x
                );
                // if not artefactGroup in store :
                artefactGroup = this.selectedGroup;

                // if temporary group and artefacts number > 2 : create new group
                if (x < 0 && artefactGroup!.artefactIds.length >= 2) {
                    if (artefactGroup) {
                        const savedGroup = await this.editionService.newArtefactGroup(
                            this.editionId,
                            artefactGroup
                        );
                        artefactGroup.groupId = savedGroup.id;
                        this.updateOperationId(x, savedGroup.id);
                    }
                    // if existing group and artefacts number > 2 : update group and its artefacts
                } else if (x > 0 && artefactGroup!.artefactIds.length >= 2) {
                    if (artefactGroup) {
                        const artefacts = artefactGroup.artefactIds.map(
                            id => this.$state.artefacts.find(id) as Artefact
                        );
                        await this.editionService.updateArtefactDTOs(
                            this.editionId,
                            artefacts
                        );
                        const savedGroup = await this.editionService.updateArtefactGroup(
                            this.editionId,
                            artefactGroup
                        );
                    }
                    // if existing group and artefacts number === 0 : delete group from edition
                } else if (x > 0 && !artefactGroup!.artefactIds.length) {
                    if (artefactGroup) {
                        await this.editionService.deleteArtefactGroup(
                            this.editionId,
                            artefactGroup.groupId
                        );
                        const groupIdx = this.edition!.artefactGroups.findIndex(
                            g => g.id === artefactGroup.id
                        );
                        this.edition!.artefactGroups.splice(groupIdx, 1);
                    }
                    // if temporary group and artefacts number === 1 : editing single artefact placement
                } else if (x < 0 && artefactGroup!.artefactIds.length === 1) {
                    if (artefactGroup) {
                        const artefacts = artefactGroup.artefactIds.map(
                            id => this.$state.artefacts.find(id) as Artefact
                        );
                        await this.editionService.updateArtefactDTOs(
                            this.editionId,
                            artefacts
                        );
                    }
                }
            });

            if (this.metricsHasChanged) {
                await this.editionService.updateMetrics(this.editionId, this.edition!.metrics);
                this.metricsHasChanged = false;
            }
        } catch (error) {
            console.error("Can't save arterfacts to server", error);
            // Shaindel: Report save error to user in Toast
            return false;
        }

        return true;
    }
    protected created() {
        this.$state.eventBus.$on('select-group', this.selectGroup);
        this.$state.eventBus.$on('delete-group', this.deleteGroup);
        this.$state.eventBus.$on('update-operation-id', this.updateOperationId);
    }

    protected destroyed() {
        this.$state.eventBus.$off('select-group', this.selectGroup);
        this.$state.eventBus.$off('delete-group', this.deleteGroup);
        this.$state.eventBus.$off('update-operation-id', this.updateOperationId);
    }

    private sidebarClicked() {
        this.isActive = !this.isActive;
    }

    private async mounted() {
        this.artefact = undefined;

        this.editionId = parseInt(this.$route.params.editionId, 10);
        await this.$state.prepare.edition(this.editionId);

        this.$root.$on('bv::modal::hide', (bvEvent: any, modalId: any) => {
            if (modalId === 'addArtefactModal') {
                const artefactId = bvEvent.trigger;
                this.onAddArtefactModalClose(artefactId);
            }
        });
    }

    private get artefacts() {
        return this.$state.artefacts.items || [];
    }

    private get edition() {
        return this.$state.editions.current;
    }

    private get placedArtefacts() {
        return this.artefacts.filter(x => x.isPlaced);
    }

    private async beforeRouteUpdate(to: any, from: any, next: () => void) {
        this.editionId = parseInt(to.params.editionId, 10);
        await this.$state.prepare.edition(this.editionId);
        next();
    }

    private onParamsChanged(evt: ArtefactEditorParamsChangedArgs) {
        this.params = evt.params as ScrollEditorParams;
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
            this.selectedGroup = ArtefactGroup.generateGroup([artefact.id]);
            const operation = new ArtefactPlacementOperation(
                artefact.id,
                'add',
                Placement.empty,
                placement
            );
            this.operationsManager.addOperation(
                new GroupPlacementOperations(this.selectedGroup.groupId, [
                    operation
                ])
            );
            this.edition!.artefactGroups.push(this.selectedGroup.clone());
        }
    }

    private saveGroupArtefacts() {
        const group = this.edition!.artefactGroups.find(
            x => x.groupId === this.selectedGroup.groupId
        );
        this.operationsManager.addOperation(
            new EditGroupOperation(
                this.selectedGroup.groupId,
                group ? group.artefactIds : [],
                this.selectedGroup.artefactIds
            )
        );
        if (group) {
            if (
                !this.selectedGroup.artefactIds ||
                !this.selectedGroup.artefactIds.length
            ) {
                this.deleteGroup(group.groupId);
            } else {
                group.artefactIds = [...this.selectedGroup.artefactIds];
            }
        } else {
            this.edition!.artefactGroups.push(this.selectedGroup.clone());
        }

        this.cancelGroup();
    }
    // delete the artefacts in the artefactGroups
    private deleteGroup(groupId: number) {
        const groupArtefact = this.edition!.artefactGroups.find(
            x => x.groupId === groupId
        );
        if (groupArtefact) {
            groupArtefact.artefactIds = [];
        }
    }

    private onSave() {
        this.operationsManager.save();
    }

    private onNewOperation(
        op: ScrollEditorOperation | GroupPlacementOperations
    ) {
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
        this.selectedGroup = ArtefactGroup.generateGroup([]);
        (this.$refs.scrollAreaRef as ScrollArea).selectArtefact(undefined);
        this.params.mode = '';
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
.artefact-container {
    overflow: auto;
    padding: 0;
    height: calc(100vh - 63px);
    width: calc(100vw - 290px);
    touch-action: none;
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
