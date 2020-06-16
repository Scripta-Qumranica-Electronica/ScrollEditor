<template>
    <div class="wrapper" id="imaged-object-editor">
        <div v-if="waiting" class="col">
            <Waiting></Waiting>
        </div>
        <div
            id="sidebar"
            class="imaged-object-menu-div col-xl-2 col-lg-3 col-md-4"
            v-if="!waiting && imagedObject"
            :class="{ active : isActive }"
        >
            <imaged-object-menu
                :imagedObject="imagedObject"
                :artefacts="visibleArtefacts"
                :artefact="artefact"
                :artefactId="artefactId"
                :params="params"
                :editable="canEdit"
                :side="side"
                :status-indicator="operationsManager"
                @paramsChanged="onParamsChanged($event)"
                @undo="onUndo($event)"
                @redo="onRedo($event)"
                @create="onNew($event)"
                @rename="onRename($event)"
                @deleteArtefact="onDeleteArtefact($event)"
                @inputRenameChanged="inputRenameChanged($event)"
                @artefactChanged="onArtefactChanged($event)"
                @onSideArtefactChanged="sideArtefactChanged($event)"
                :saving="saving"
                :renaming="renaming"
                :renameInputActive="renameInputActive"
            ></imaged-object-menu>
        </div>

        <div
            id="content"
            class="container col-xl-12 col-lg-12 col-md-12"
            v-if="!waiting && imagedObject"
        >
            <!-- todo: add external div with the condition -->
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

                    <b-button
                        v-for="mode in editList"
                        :key="mode.val"
                        @click="editingModeChanged(mode.val)"
                        :pressed="modeChosen(mode.val)"
                        class="sidebarCollapse"
                        v-b-tooltip.hover.bottom
                        :title="mode.title"
                    >
                        <i :class="mode.icon"></i>
                    </b-button>
                </div>

                <div class="imaged-object-container" :class="{active: isActive}">
                    <div id="imaged-object-title">
                        {{ imagedObject.id }}
                        <edition-icons :edition="edition" :show-text="true" />
                    </div>

                    <zoomer :zoom="zoomLevel" @new-zoom="onNewZoom($event)">
                        <svg
                            class="overlay"
                            :width="actualWidth"
                            :height="actualHeight"
                            :viewBox="`0 0 ${actualWidth} ${actualHeight}`"
                        >
                            <!-- Coordinate system is in the displayed image size (0,0) - (actualWidth,actualHeight) with rotation -->
                            <g :transform="transform" id="transform-root">
                                <!-- Coordinate system is in master image coordinates -->
                                <image-layer
                                    v-if="artefact"
                                    :width="imageWidth"
                                    :height="imageHeight"
                                    :params="params"
                                    :editable="canEdit"
                                    :clipping-mask="artefact.mask"
                                />
                                <artefact-layer
                                    :selected="art.id === artefact.id"
                                    v-for="art in visibleArtefacts"
                                    :artefact="art"
                                    :key="art.id"
                                    :color="removeColor ? 'none' : getArtefactColor(art)"
                                />
                                <boundary-drawer
                                    v-if="canEdit && artefact"
                                    :color="isErasing ? 'black' : getArtefactColor(artefact)"
                                    transform-root-id="transform-root"
                                    @new-polygon="onNewPolygon($event)"
                                />
                            </g>
                        </svg>
                    </zoomer>
                </div>
            </div>
        </div>
    </div>
</template>

<!-- <script src="https://unpkg.com/vue-toasted"></script>-->
<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import Waiting from '@/components/misc/Waiting.vue';
import ImagedObjectService from '@/services/imaged-object';
import EditionService from '@/services/edition';
import { ImagedObject } from '@/models/imaged-object';
import { Artefact } from '@/models/artefact';
import ImagedObjectMenu from '@/views/imaged-object-editor/imaged-object-menu.vue';
import {
    ImagedObjectEditorParams,
    EditorParamsChangedArgs,
    MaskChangeOperation,
    MaskChangedEventArgs,
    DrawingMode,
    ArtefactEditingData
} from '@/views/imaged-object-editor/types';
import { Position } from '@/models/misc';
import { IIIFImage } from '@/models/image';
import ImageLayer from '@/views/imaged-object-editor/image-layer.vue';
import ArtefactLayer from '@/views/imaged-object-editor/artefact-layer.vue';
import { Polygon } from '@/utils/Polygons';
import { Side } from '@/models/misc';
import { ZoomRequestEventArgs } from '@/models/editor-params';
import ArtefactService from '@/services/artefact';
import { DropdownOption } from '@/utils/helpers';
import BoundaryDrawer from '@/components/polygons/boundary-drawer.vue';
import Zoomer, { ZoomEventArgs } from '@/components/misc/zoomer.vue';
import { normalizeOpacity } from '@/components/image-settings/types';
import { addToArray } from '@/utils/collection-utils';
import EditionIcons from '@/components/cues/edition-icons.vue';
import { OperationsManager, SavingAgent } from '@/utils/operations-manager';
import { ImagedObjectEditorOperation } from './operations';
@Component({
    name: 'imaged-object-editor',
    components: {
        Waiting,
        'imaged-object-menu': ImagedObjectMenu,
        'image-layer': ImageLayer,
        'artefact-layer': ArtefactLayer,
        'boundary-drawer': BoundaryDrawer,
        'zoomer': Zoomer,
        'edition-icons': EditionIcons
    }
})
export default class ImagedObjectEditor extends Vue implements SavingAgent {
    private static colors = [
        'purple',
        'blue',
        'orange',
        'red',
        'green',
        'gray',
        'magenta',
        'olive',
        'brown',
        'cadetBlue'
    ];

    private imagedObjectService = new ImagedObjectService();
    private artefactService = new ArtefactService();
    private editionService = new EditionService();
    private waiting = true;
    private artefactId: number = -1;
    private initialMask = new Polygon();
    private params = new ImagedObjectEditorParams();
    private saving = false;
    private renaming = false;
    private renameInputActive: Artefact | null = null;
    private nonSelectedMask = new Polygon();
    // private artefactEditingDataList: ArtefactEditingData[] = [];
    // private artefactEditingData = new ArtefactEditingData();
    private isActive = false;
    private masterImage?: IIIFImage;
    private side: Side = 'recto';
    private operationsManager = new OperationsManager<
        ImagedObjectEditorOperation
    >(this);

    public async saveEntities(ids: number[]): Promise<boolean> {
        // if (!this.artefact) {
        //     throw new Error("Can't save if there is no artefact");
        // }

        for (const id of ids) {
            const artefact = this.artefacts.find(x => x.id === id);
            if (!artefact) {
                console.warn(`Can't find artefact ${id} for saving`);
                continue;
            }
            try {
                await this.artefactService.changeArtefact(
                    this.editionId,
                    artefact
                );
                this.showMessage('toasts.imagedObjectSaved', 'success');
            } catch (error) {
                console.error("Can't save arterfact to server", error);
                this.showMessage('toasts.imagedObjectFailed', 'error');
                continue;
            }
        }

        return true;
    }

    private get artefact(): Artefact | undefined {
        const artefact = this.artefacts.find(x => x.id === this.artefactId);
        return artefact;
    }

    private get editList(): any[] {
        if (this.canEdit) {
            return [
                {
                    icon: 'fa fa-pencil',
                    val: 'DRAW',
                    title: this.$t('misc.draw')
                },
                {
                    icon: 'fa fa-trash',
                    val: 'ERASE',
                    title: this.$t('misc.cancel')
                }
            ];
        }
        return [];
    }
    private get zoomLevel(): number {
        return this.params.zoom;
    }

    private get imagedObject(): ImagedObject | undefined {
        return this.$state.imagedObjects.current;
    }

    private get editionId(): number {
        return parseInt(this.$route.params.editionId);
    }

    private get edition() {
        return this.$state.editions.current!;
    }

    private get canEdit(): boolean {
        return this.$state.editions.current?.permission.mayWrite || false;
    }

    private get actualWidth(): number {
        return (
            (this.rotationAngle % 180 ? this.imageHeight : this.imageWidth) *
            this.zoomLevel
        );
    }

    private get actualHeight(): number {
        return (
            (this.rotationAngle % 180 ? this.imageWidth : this.imageHeight) *
            this.zoomLevel
        );
    }

    private get rotationAngle(): number {
        return ((this.params.rotationAngle % 360) + 360) % 360;
    }

    private get transform(): string {
        // Rotation
        const rotate = `rotate(${this.rotationAngle}, ${this.imageWidth /
            2}, ${this.imageHeight / 2})`;

        // If the rotation is by 90 or 270 degrees, the image need to be moved a little bit.
        // Since the image's width is larger than its height, rotation by 90 degrees (or 270) results in a
        // white band to the left of the rotated image. The top of the image is cut-off by exactly the
        // width of the white band.
        let translate = '';
        if (this.rotationAngle % 180) {
            // 90 or 270
            // The band is caused by the new width (old height) being smaller than the old width.
            // There actually two bands, one to the left and one to the right. The right one can't be seen.
            const bandWidth = (this.imageWidth - this.imageHeight) / 2;
            translate = `translate(-${bandWidth}, ${bandWidth})`;
        }

        const scale = `scale(${this.zoomLevel})`;

        return `${scale} ${translate} ${rotate}`;
    }

    private get imageWidth(): number {
        return this.masterImage!.manifest.width;
    }

    private get imageHeight(): number {
        return this.masterImage!.manifest.height;
    }

    private get visibleArtefacts(): Artefact[] {
        return this.artefacts.filter(item => item.side === this.side);
    }

    private get artefacts(): Artefact[] {
        return this.imagedObject!.artefacts || [];
    }
    private get readOnly(): boolean {
        return this.$state.editions.current!.permission.readOnly;
    }
    private async mounted() {
        try {
            this.waiting = true;
            await this.$state.prepare.edition(this.editionId);
            this.$state.imagedObjects.current = this.$state.imagedObjects.find(
                this.$route.params.imagedObjectId
            );

            if (!this.imagedObject) {
                console.error(
                    `Can't located imaged object ${this.$route.params.imagedObjectId} in edition ${this.editionId}`
                );
                throw new Error(
                    `Can't located imaged object ${this.$route.params.imagedObjectId} in edition ${this.editionId}`
                );
            }

            // Set default side
            if (this.imagedObject.recto) {
                this.side = 'recto';
            } else if (this.imagedObject.verso) {
                this.side = 'verso';
            } else {
                throw new Error(
                    `Imaged Object ${this.$route.params.imagedObjectId} has no side!`
                );
            }

            const stack = this.imagedObject.getImageStack(this.side)!;
            await this.$state.prepare.imageManifest(stack.master);
            this.masterImage = stack.master;

            if (this.imagedObject.artefacts.length) {
                this.onArtefactChanged(this.visibleArtefacts[0]);

                // Remove this because it will happen in onArtefactChanged function.
                this.initialMask = this.artefact!.mask;
            } else {
                this.artefactId = -1;
                this.initialMask = new Polygon();
            }
        } finally {
            this.waiting = false;
        }

        this.fillImageSettings();
    }

    private created() {
        window.addEventListener('beforeunload', e => this.confirmLeaving(e));
    }

    private confirmLeaving(e: BeforeUnloadEvent) {
        if (this.operationsManager.isDirty) {
            // check if there unsaved changes
            const confirmationMessage =
                'It looks like you have been editing something. ' +
                'If you leave before saving, your changes will be lost.';

            (e || window.event).returnValue = confirmationMessage;
            return confirmationMessage;
        }
    }

    private fillImageSettings() {
        this.params.imageSettings = {};
        if (this.imagedObject) {
            if (
                this.imagedObject &&
                this.imagedObject.getImageStack(this.side)
            ) {
                for (const imageType of this.imagedObject.getImageStack(
                    this.side
                )!.availableImageTypes) {
                    const image = this.imagedObject
                        .getImageStack(this.side)!
                        .getImage(imageType);
                    if (image) {
                        const master =
                            this.imagedObject.getImageStack(this.side)!.master
                                .type === imageType;
                        const imageSetting = {
                            image,
                            type: imageType,
                            visible: master,
                            opacity: 1,
                            normalizedOpacity: 1
                        };
                        this.$set(
                            this.params.imageSettings,
                            imageType,
                            imageSetting
                        ); // Make sure this object is tracked by Vue
                    }
                }
                normalizeOpacity(this.params.imageSettings);
            }
        }
    }

    private editingModeChanged(val: any) {
        (this as any).params.drawingMode = DrawingMode[val];
    }

    private onParamsChanged(evt: EditorParamsChangedArgs) {
        this.params = evt.params; // This makes sure a change is triggered in child components
    }

    private onNewZoom(event: ZoomEventArgs) {
        this.params.zoom = event.zoom;
    }

    // private onSave() {
    //     if (!this.operationsManager.isDirty) {
    //         this.showMessage('toasts.NoChangesDetected');
    //         return;
    //     }
    //     this.operationsManager.save();
    // }
    // private onSave() {
    //     if (!this.artefact) {
    //         throw new Error("Can't save if there is no artefact");
    //     }
    //     this.saving = true;
    //     let savedFlag = false;
    //     let errorFlag = false;

    //     this.artefacts.forEach(async (art, index) => {
    //         if (this.artefactEditingDataList[index].dirty) {
    //             savedFlag = true;

    //             await this.artefactService
    //                 .changeArtefact(this.editionId, art)
    //                 .catch(() => {
    //                     errorFlag = true;
    //                 })
    //                 .finally(() => {
    //                     if (index === this.artefacts.length - 1) {
    //                         this.showSaveMsg(savedFlag, errorFlag);
    //                     }
    //                 });
    //             this.artefactEditingDataList[index].dirty = false;
    //         } else {
    //             setTimeout(() => {
    //                 if (index === this.artefacts.length - 1) {
    //                     this.showSaveMsg(savedFlag, errorFlag);
    //                 }
    //             }, 1000);
    //         }
    //     });
    // }

    private onUndo() {
        this.operationsManager.undo();
    }

    private onRedo() {
        this.operationsManager.redo();
    }

    private onNew(art: Artefact) {
        addToArray(art, this.imagedObject!.artefacts);

        this.artefactId = art.id;
        if (!this.artefact) {
            throw new Error("Can't create if there is no artefact");
        }
        this.saving = true;
        try {
            // this.artefactEditingData = new ArtefactEditingData();
            // this.artefactEditingDataList.push(this.artefactEditingData);
            this.showMessage('toasts.artefactCreated', 'success');
        } catch (err) {
            this.showMessage('toasts.artefactCreatedFailed', 'error');
        } finally {
            this.saving = false;
        }
    }

    private async onRename() {
        if (!this.artefact) {
            throw new Error("Can't rename if there is no artefact");
        }
        this.renaming = true;
        try {
            await this.artefactService.changeArtefact(
                this.editionId,
                this.artefact
            );
            this.showMessage('toasts.artefactRenamed', 'success');
            // this.renameInputActive = {};
            this.inputRenameChanged(undefined);
        } catch (err) {
            this.showMessage('toasts.artefactRenameFailed', 'error');
        } finally {
            this.renaming = false;
        }
    }

    private async onDeleteArtefact(art: Artefact) {
        try {
            await this.artefactService.deleteArtefact(art);
            this.showMessage('toasts.artefactDeleted', 'success');
            const index = this.artefacts.indexOf(art);


            if (this.artefacts[0]) {
                this.artefactId = this.artefacts[0].id;
            } else {
                this.artefactId = 0;
                this.initialMask = new Polygon();
            }
        } catch (err) {
            console.error(err);
            this.showMessage('toasts.deleteArtefactFailed', 'error');
        }
    }

    private inputRenameChanged(art: Artefact | undefined) {
        this.renameInputActive = art ? art : null;
    }

    private onArtefactChanged(art: Artefact) {
        this.artefactId = art.id;
        // const index = this.artefacts.indexOf(art); // index artefact in artefact list.
        // this.artefactEditingData = this.getArtefactEditingData(index);

        this.nonSelectedMask = new Polygon();
        for (const artefact of this.visibleArtefacts) {
            if (artefact.id !== art.id) {
                this.nonSelectedMask = Polygon.add(
                    this.nonSelectedMask,
                    artefact.mask
                );
            }
        }
    }

    private sideArtefactChanged(side: DropdownOption) {
        this.side = side.name as Side;
        if (this.artefact!.side !== side.name && this.visibleArtefacts.length) {
            this.onArtefactChanged(this.visibleArtefacts[0]);
        }
        this.fillImageSettings();
    }

    // private getArtefactEditingData(index: number) {
    //     return this.artefactEditingDataList[index];
    // }

    private showMessage(msg: string, type: string = 'info') {
        this.$toasted.show(this.$tc(msg), {
            type,
            position: 'top-right',
            duration: 7000
        });
    }

    private sidebarClicked() {
        this.isActive = !this.isActive;
    }

    private modeChosen(val: DrawingMode): boolean {
        return (
            DrawingMode[val].toString() === this.params.drawingMode.toString()
        );
    }

    private getArtefactColor(art: Artefact) {
        const idx = this.visibleArtefacts.indexOf(art);
        if (idx === -1) {
            console.error("Can't locate artefact in this.artefacts");
            // throw new Error("Can't locate artefact in this.artefacts");
        }

        return ImagedObjectEditor.colors[
            idx % ImagedObjectEditor.colors.length
        ];
    }

    private get isErasing() {
        return this.params.drawingMode === DrawingMode.ERASE;
    }
    private get removeColor() {
        return this.params.highLight === false;
    }

    private onNewPolygon(poly: Polygon) {
        let newPolygon: Polygon;

        if (this.isErasing) {
            newPolygon = Polygon.subtract(this.artefact!.mask, poly);
        } else {
            newPolygon = Polygon.add(this.artefact!.mask, poly);
        }

        // Check if the new mask intersects with a non selected artefact mask
        const intersection = Polygon.intersect(
            newPolygon,
            this.nonSelectedMask
        );
        if (!intersection.empty) {
            this.$toasted.show(this.$tc('toasts.artefactCantOverlap'), {
                type: 'info',
                position: 'top-center',
                duration: 5000
            });
            return;
        }

        console.log(
            this.artefact!.mask.svg,
            newPolygon.svg,
            'hasChanged'
        );
        this.operationsManager.addOperation(
            new ImagedObjectEditorOperation(
                this.artefact!.id,
                this.isErasing ? 'erase' : 'draw',
                this.artefact!.mask,
                newPolygon
            )
        );
        this.artefact!.mask = newPolygon;
    }
}

/*
 * Todo:
 *
 * Add a shrinkFactor data element, initialize to 20.
 * Pass shrinkFactor as a property to ImagedObjectCanvas, and not as a data entry of ImagedObjectCanvas
 * Change ImagedObjectCanvas to use the optimizedMask instead of the mask
 * Make sure ImagedObjectCanvas does not shrink the mask (in clipCanvas and trace)
 * Before saving, call unoptimize mask to create the larger mask again
 */
</script>

<style lang="scss" scoped>
// @import '~sass-vars';
.readOnly {
    text-align: center;
}
.overlay {
    position: absolute;
    transform-origin: top left;
}

#imaged-object-editor {
    overflow: hidden;
    height: calc(100vh - 63px);
}

.imaged-object-container {
    overflow: auto;
    position: relative;
    padding: 0;
    height: calc(100vh - 63px);
    width: calc(100vw - 290px);
    touch-action: none;
}
.imaged-object-container.active {
    overflow: auto;
    position: relative;
    padding: 0;
    height: calc(100vh - 63px);
    width: calc(100vw - 40px);
}
.imaged-object-menu-div {
    height: calc(100vh - 63px);
    overflow: hidden;
}
#buttons-div {
    background-color: #eff1f4;
}

.sidebarCollapse {
    width: 40px;
    height: 40px;
    display: block;
    margin-bottom: 5px;
}

.wrapper {
    display: flex;
    align-items: stretch;
    perspective: 1500px;
}

#imaged-object-title {
    margin-left: 80px;
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

@media (max-width: 1100px) {
    /* Reversing the behavior of the sidebar: 
       it'll be rotated vertically and off canvas by default, 
       collapsing in on toggle button click with removal of 
       the vertical rotation.   */
    #sidebar {
        margin-left: -250px;
        transform: rotateY(100deg);
    }
    #sidebar.active {
        margin-left: 0;
        transform: none;
    }

    .imaged-object-container {
        overflow: scroll;
        position: relative;
        padding: 0;
        height: calc(100vh - 63px);
        width: calc(100vw - 40px);
    }

    .imaged-object-container.active {
        overflow: scroll;
        position: relative;
        padding: 0;
        height: calc(100vh - 63px);
        width: calc(100vw - 40px);
    }
}
</style>
