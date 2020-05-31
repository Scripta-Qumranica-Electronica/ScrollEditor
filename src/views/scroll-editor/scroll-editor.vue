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
                @paramsChanged="onParamsChanged($event)"
                @new-operation="onNewOperation($event)"
                @saveArt="onSave()"
                @undo="onUndo()"
                @redo="onRedo()"
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
                    <scroll-area
                        @onSelectArtefact="selectArtefact($event)"
                        :params="params"
                        @new-operation="onNewOperation($event)"
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
import { TransformationDTO } from '@/dtos/sqe-dtos';
import ArtefactService from '@/services/artefact';
import { OperationsManager, SavingAgent } from '@/utils/operations-manager';
import { ScrollEditorOperation } from './operations';
import { Transformation } from '@/utils/Mask';

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
    private operationsManager = new OperationsManager<ScrollEditorOperation>(
        this
    );

    public selectArtefact(artefact: Artefact | undefined) {
        this.artefact = artefact;
    }

    public async saveEntities(ids: number[]): Promise<boolean> {
        for (const id of ids) {
            const artefact = this.$state.artefacts.find(id);
            if (!artefact) {
                console.warn(`Can't find artefact ${id} for saving`);
                continue;
            }
            try {
                await this.artefactService.changeArtefact(
                    this.editionId,
                    artefact
                );
            } catch (error) {
                console.error("Can't save arterfact to server", error);
                // Shaindel: Report save error to user in Toast
                return false;
            }
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

    private get placedArtefacts() {
        return this.artefacts.filter(x => x.isPlaced);
    }

    private async beforeRouteUpdate(to: any, from: any, next: () => void) {
        // Shaindel: Add types
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

            const transformation = new Transformation({
                translate: {
                    x: 800 * numberOfPlaced,
                    y: 400
                },
                scale: 1,
                rotate: 0
            });
            artefact.placeOnScroll(transformation);
            this.operationsManager.addOperation(
                new ScrollEditorOperation(
                    artefact,
                    'add',
                    Transformation.empty,
                    transformation
                )
            );
        }
    }

    private onSave() {
        this.operationsManager.save();
    }

    private onNewOperation(op: ScrollEditorOperation) {
        this.operationsManager.addOperation(op);
    }

    private onUndo() {
        this.operationsManager.undo();
    }

    private onRedo() {
        this.operationsManager.redo();
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
