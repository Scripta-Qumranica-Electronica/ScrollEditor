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
            ></scroll-menu>
            <!-- {{edition.groupsArtefacts}} -->
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
                    <scroll-area
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
import { ScrollEditorOperation, PlacementOperation } from './operations';
import EditionService from '@/services/edition';
import { Placement } from '@/utils/Placement';
import { GroupArtefacts } from '../../models/edition';

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
    private editionId: number = 0;
    private params: ScrollEditorParams = new ScrollEditorParams();
    private artefactService = new ArtefactService();
    private editionService = new EditionService();
    private selectedGroup: GroupArtefacts = new GroupArtefacts([]);
    private operationsManager = new OperationsManager<ScrollEditorOperation>(
        this
    );

    public selectArtefact(artefact: Artefact | undefined) {
        const existingGroup = this.edition!.groupsArtefacts.find(
            x => artefact && x.ids.includes(artefact!.id)
        );

        if (this.params.mode === 'manageGroup') {
            const isSelectedIndex = this.selectedGroup.ids.findIndex(
                a => a === artefact!.id
            );

            if (isSelectedIndex > -1) {
                // remove artefact from current group
                this.selectedGroup.ids.splice(isSelectedIndex, 1);
            } else if (!existingGroup) {
                // if artefact not in any group
                this.selectedGroup.ids.push(artefact!.id!);
            } else if (existingGroup) {
                // if artefact already in group
                this.selectedGroup.id = existingGroup.id;
                this.selectedGroup.ids = [...existingGroup.ids];
            }
        } else {
            if (existingGroup) {
                // if artefact already in group
                this.selectedGroup.id = existingGroup.id;
                this.selectedGroup.ids = [...existingGroup.ids];
            } else {
                this.selectedGroup.ids = [artefact!.id!];
            }
            this.artefact = artefact;
        }
    }

    public async saveEntities(ids: number[]): Promise<boolean> {
        const artefacts = ids.map(
            x => this.$state.artefacts.find(x) as Artefact
        );
        try {
            await this.editionService.updateArtefactDTOs(
                this.editionId,
                artefacts
            );
        } catch (error) {
            console.error("Can't save arterfacts to server", error);
            // Shaindel: Report save error to user in Toast
            return false;
        }

        return true;
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
            this.operationsManager.addOperation(
                new PlacementOperation(
                    artefact.id,
                    'add',
                    Placement.empty,
                    placement
                )
            );
        }
    }

    private saveGroupArtefacts() {
        const group = this.edition!.groupsArtefacts.find(
            x => x.id === this.selectedGroup.id
        );
        if (group) {
            group.ids = [...this.selectedGroup.ids];
        } else {
            this.edition!.groupsArtefacts.push({ ...this.selectedGroup });
        }

        this.cancelGroup();
    }

    private onSave() {
        this.operationsManager.save();
    }

    private onNewOperation(op: ScrollEditorOperation) {
        if (op.type === 'delete') {
            (this.$refs.scrollAreaRef as ScrollArea).selectArtefact(undefined);
        }
        this.operationsManager.addOperation(op);
    }

    private onUndo() {
        this.operationsManager.undo();
    }

    private onRedo() {
        this.operationsManager.redo();
    }
    private cancelGroup() {
        this.selectedGroup = new GroupArtefacts([]);
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
    // position: relative;
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
