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
                :params="params"
                :editable="canEdit"
                :side="side"
                @paramsChanged="onParamsChanged($event)"
                @save="onSave($event)"
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
                    <b-button type="button" class="sidebarCollapse" @click="sidebarClicked()">
                        <i class="fa fa-align-justify"></i>
                    </b-button>

                    <b-button
                        v-for="mode in editList"
                        :key="mode.val"
                        @click="editingModeChanged(mode.val)"
                        :pressed="modeChosen(mode.val)"
                        class="sidebarCollapse"
                    >
                        <i :class="mode.icon"></i>
                    </b-button>
                </div>
                <div class="imaged-object-container" :class="{active: isActive}">
                    <div
                        ref="overlay-div"
                        v-if="!waiting && imagedObject"
                        :width="actualWidth"
                        :height="actualHeight"
                        id="overlay-div"
                    >
                        <div id="zoom-div" :style="{transform: `scale(${zoomLevel})`}">
                            <div
                                id="rotate-div"
                                :width="rotateDivWidth"
                                :height="rotateDivHeight"
                                :style="{transform: `translate${translatePosition} rotate(${rotationAngle}deg)`}"
                            >
                                <image-layer
                                    class="overlay-image"
                                    :width="imageWidth"
                                    :height="imageHeight"
                                    :params="params"
                                    :editable="canEdit"
                                    :clipping-mask="artefact.mask.polygon"
                                ></image-layer>
                                <artefact-layer
                                    class="overlay-qrtefact"
                                    :width="imageWidth"
                                    :height="imageHeight"
                                    :selected="false"
                                    v-for="artefact in nonSelectedArtefacts"
                                    :key="artefact.id"
                                    :color="getArtefactColor(artefact)"
                                />
                                <artefact-layer
                                    class="overlay-artefact"
                                    v-if="artefact"
                                    :width="imageWidth"
                                    :height="imageHeight"
                                    :params="params"
                                    :selected="true"
                                    :editable="canEdit"
                                    :artefact="artefact"
                                    :color="getArtefactColor(artefact)"
                                />
                            </div>
                        </div>
                    </div>
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
import ImagedObjectMenu from './imaged-object-menu.vue';
import {
    ImagedObjectEditorParams,
    EditorParamsChangedArgs,
    MaskChangeOperation,
    MaskChangedEventArgs,
    DrawingMode,
    ArtefactEditingData,
} from './types';
import { Position } from '@/utils/PointerTracker';
import { IIIFImage } from '@/models/image';
import ImageLayer from './image-layer.vue';
import ArtefactLayer from './artefact-layer.vue';
import { Polygon } from '@/utils/Polygons';
import { Side } from '../../models/misc';
import { ZoomRequestEventArgs } from '@/models/editor-params';
import ArtefactService from '@/services/artefact';
import { DropdownOption } from '../../utils/helpers';

@Component({
    name: 'imaged-object-editor',
    components: {
        Waiting,
        'imaged-object-menu': ImagedObjectMenu,
        'image-layer': ImageLayer,
        'artefact-layer': ArtefactLayer
    }
})
export default class ImagedObjectEditor extends Vue {
    private static colors = [
        'purple', 'blue', 'orange', 'red', 'green', 'gray', 'magenta', 'olive', 'brown', 'cadetBlue'
    ];

    private imagedObjectService = new ImagedObjectService();
    private artefactService = new ArtefactService();
    private editionService = new EditionService();
    private waiting = true;
    private artefact?: Artefact;
    private initialMask = new Polygon();
    private params = new ImagedObjectEditorParams();
    private saving = false;
    private renaming = false;
    private renameInputActive?: Artefact;
    private nonSelectedArtefacts: Artefact[] = [];
    private nonSelectedMask = new Polygon();
    private artefactEditingDataList: ArtefactEditingData[] = [];
    private artefactEditingData = new ArtefactEditingData();
    private artefacts = [] as Artefact[];
    private isActive = false;
    private masterImage?: IIIFImage;
    private side: Side = 'recto';

    private get editList(): any[] {
        if (this.canEdit) {
            return [
                { icon: 'fa fa-pencil', val: 'DRAW' },
                { icon: 'fa fa-trash', val: 'ERASE' },
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

    private get canEdit(): boolean {
        return this.$state.editions.current
            ? this.$state.editions.current.permission.mayWrite
            : false;
    }

    private get actualWidth(): number {
        return this.imageWidth * this.zoomLevel;
    }

    private get actualHeight(): number {
        return this.imageHeight * this.zoomLevel;
    }

    private get rotateDivWidth(): number {
        return this.imageWidth;
    }

    private get rotateDivHeight(): number {
        return this.imageHeight;
    }

    private get rotationAngle(): number {
        return ((this.params.rotationAngle % 360) + 360) % 360;
    }

    private get translatePosition(): string {
        switch (this.rotationAngle) {
            case 90: {
                return `(${this.rotateDivHeight}px, 0px)`;
            }
            case 180: {
                return `(${this.rotateDivWidth}px, ${this.rotateDivHeight}px)`;
            }
            case 270: {
                return `(0px, ${this.rotateDivWidth}px)`;
            }
            default: {
                return '(0, 0)';
            }
        }
    }

    private get overlayDiv(): HTMLDivElement {
        return this.$refs['overlay-div'] as HTMLDivElement;
    }

    private get imageWidth(): number {
        return this.masterImage!.manifest.width;
    }

    private get imageHeight(): number {
        return this.masterImage!.manifest.height;
    }

    private get visibleArtefacts(): Artefact[] {
        return this.artefacts.filter(
            (item) => item.side === this.side
        );
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
                throw new Error(`Imaged Object ${this.$route.params.imagedObjectId} has no side!`);
            }

            const stack = this.imagedObject.getImageStack(this.side)!;
            await this.$state.prepare.imageManifest(stack.master);
            this.masterImage = stack.master;

            if (this.imagedObject.artefacts.length) {
                this.optimizeArtefacts();
                // Set this.artefact to visibleArtefacts[0]
                this.artefacts.forEach((element) => {
                    this.artefactEditingDataList.push(
                        new ArtefactEditingData()
                    );
                });
                this.onArtefactChanged(this.visibleArtefacts[0]);
                this.artefacts.forEach((element) => {
                    this.artefactEditingDataList.push(
                        new ArtefactEditingData()
                    );
                });
                // Remove this because it will happen in onArtefactChanged function.
                // this.artefactEditingData = this.getArtefactEditingData(0);
                this.initialMask = this.artefact!.mask.polygon;
            } else {
                this.artefact = undefined;
                this.initialMask = new Polygon();
            }
        } finally {
            this.waiting = false;
        }

        this.fillImageSettings();
        // Remove this because it will happen in onArtefactChanged function.
        // this.prepareNonSelectedArtefacts();
    }

    private created() {
        window.addEventListener('beforeunload', (e) => this.confirmLeaving(e));
    }

    private confirmLeaving(e: BeforeUnloadEvent) {
        this.artefactEditingDataList.forEach((art) => {
            if (art.dirty) {
                // check if there unsaved changes
                const confirmationMessage =
                    'It looks like you have been editing something. ' +
                    'If you leave before saving, your changes will be lost.';

                (e || window.event).returnValue = confirmationMessage;
                return confirmationMessage;
            }
        });
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
                            this.imagedObject.getImageStack(this.side)!
                                .master.type === imageType;
                        const imageSetting = {
                            image,
                            type: imageType,
                            visible: master,
                            opacity: 1
                        };
                        this.$set(
                            this.params.imageSettings,
                            imageType,
                            imageSetting
                        ); // Make sure this object is tracked by Vue
                    }
                }
            }
        }
    }

    private optimizeArtefacts() {
        this.artefacts = this.imagedObject!.artefacts || [];
    }

    private onMaskChanged(eventArgs: MaskChangedEventArgs) {
        if (!this.artefact) {
            throw new Error("Can't set mask if there is no artefact");
        }
        this.artefactEditingData.dirty = true;

        // Check if the new mask intersects with a non selected artefact mask
        const intersection = Polygon.intersect(
            eventArgs.mask,
            this.nonSelectedMask
        );
        if (!intersection.empty) {
            this.$toasted.show("Artefact can't overlap other artefacts", {
                type: 'info',
                position: 'top-center',
                duration: 5000
            });
            return;
        }

        // Store the old masks for the undo buffer
        const changeOperation = {
            prevMask: this.artefact.mask.polygon,
        } as MaskChangeOperation;

        // Calculate the new masks (the unoptimized mask is used by the ROI Canvas)
        this.artefact.mask.polygon = eventArgs.mask;

        changeOperation.newMask = this.artefact.mask.polygon;

        if (this.artefactEditingData.undoList.length >= 50) {
            this.artefactEditingData.undoList.slice(1);
        }

        this.artefactEditingData.undoList.push(changeOperation);
        this.artefactEditingData.redoList = [];
    }

    private editingModeChanged(val: any) {
        (this as any).params.drawingMode = DrawingMode[val];
    }

    private onParamsChanged(evt: EditorParamsChangedArgs) {
        this.params = evt.params; // This makes sure a change is triggered in child components
    }

    private onZoomRequest(event: ZoomRequestEventArgs) {
        const oldZoom = this.params.zoom;
        const newZoom = Math.min(Math.max(oldZoom + event.amount, 0.05), 1);
        if (newZoom === oldZoom) {
            return;
        }

        // After changing the zoom, we want to change the scrollbars to that the mouse cursor stays
        // on the same place in the image. First we need to know the exact coordinates before the zoom
        // We get screen cordinates, we need to translate them to client coordinates
        const viewport = this.overlayDiv.getBoundingClientRect();
        const oldMousePosition = {
            x:
                event.clientPosition.x -
                viewport.left +
                this.overlayDiv.scrollLeft,
            y:
                event.clientPosition.y -
                viewport.top +
                this.overlayDiv.scrollTop
        };
        const newMousePosition = {
            x: (oldMousePosition.x * newZoom) / oldZoom,
            y: (oldMousePosition.y * newZoom) / oldZoom
        };
        const scrollDelta = {
            x: newMousePosition.x - oldMousePosition.x,
            y: newMousePosition.y - oldMousePosition.y
        };

        setTimeout(() => {
            this.overlayDiv.scrollLeft += scrollDelta.x;
            this.overlayDiv.scrollTop += scrollDelta.y;
        }, 0);

        this.params.zoom = newZoom;
    }

    private showSaveMsg(savedFlag: boolean, errorFlag: boolean) {
        this.saving = false;

        if (!savedFlag) {
            this.showMessage('No changes detected');
        } else if (errorFlag) {
            this.showMessage('Imaged Object Save Failed', 'error');
        } else {
            this.showMessage('Imaged Object Saved', 'success');
        }
    }

    private onSave() {
        if (!this.artefact) {
            throw new Error("Can't save if there is no artefact");
        }
        this.saving = true;
        let savedFlag = false;
        let errorFlag = false;

        this.artefacts.forEach(async (art, index) => {
            if (this.artefactEditingDataList[index].dirty) {
                savedFlag = true;

                await this.artefactService
                    .changeArtefact(this.editionId, art)
                    .catch(() => {
                        errorFlag = true;
                    })
                    .finally(() => {
                        if (index === this.artefacts.length - 1) {
                            this.showSaveMsg(savedFlag, errorFlag);
                        }
                    });
                this.artefactEditingDataList[index].dirty = false;
            } else {
                setTimeout(() => {
                    if (index === this.artefacts.length - 1) {
                        this.showSaveMsg(savedFlag, errorFlag);
                    }
                }, 1000);
            }
        });
    }

    private onUndo() {
        if (!this.artefact) {
            throw new Error("Can't undo mask if there is no artefact");
        }
        if (this.artefactEditingData.undoList.length) {
            this.artefactEditingData.dirty = true;

            const toUndo: MaskChangeOperation = this.artefactEditingData.undoList.pop()!;
            this.artefactEditingData.redoList.push(toUndo);

            this.artefact.mask.polygon = toUndo.prevMask;
        }
    }

    private onRedo() {
        if (!this.artefact) {
            throw new Error("Can't redo mask if there is no artefact");
        }
        if (this.artefactEditingData.redoList.length) {
            const toRedo: MaskChangeOperation = this.artefactEditingData.redoList.pop()!;
            this.artefactEditingData.undoList.push(toRedo);

            this.artefact.mask.polygon = toRedo.newMask;
        }
    }

    private async onNew(art: Artefact) {
        this.artefacts.push(art);

        this.artefact = art;
        this.prepareNonSelectedArtefacts();
        if (!this.artefact) {
            throw new Error("Can't create if there is no artefact");
        }
        this.saving = true;
        try {
            this.artefactEditingData = new ArtefactEditingData();
            this.artefactEditingDataList.push(this.artefactEditingData);
            this.showMessage('Artefact Created', 'success');
        } catch (err) {
            this.showMessage('Artefact creation failed', 'error');
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
            this.showMessage('Artefact renamed', 'success');
            // this.renameInputActive = {};
            this.inputRenameChanged(undefined);
        } catch (err) {
            this.showMessage('Artefact rename failed', 'error');
        } finally {
            this.renaming = false;
        }
    }

    private async onDeleteArtefact(art: Artefact) {
        try {
            await this.artefactService.deleteArtefact(art);
            this.showMessage('Artefact deleted', 'success');
            const index = this.artefacts.indexOf(art);
            this.artefacts.splice(index, 1);
            this.artefactEditingDataList.splice(index, 1);

            if (this.artefacts[0]) {
                this.artefact = this.artefacts[0];
                this.artefactEditingData = this.artefactEditingDataList[0];
            } else {
                this.artefact = undefined;
                this.initialMask = new Polygon();
            }
            this.prepareNonSelectedArtefacts();
        } catch (err) {
            console.error(err);
            this.showMessage('Delete artefact failed', 'error');
        }
    }

    private inputRenameChanged(art: Artefact | undefined) {
        this.renameInputActive = art;
    }

    private onArtefactChanged(art: Artefact) {
        this.artefact = art;
        const index = this.artefacts.indexOf(art); // index artefact in artefact list.
        this.artefactEditingData = this.getArtefactEditingData(index);
        this.prepareNonSelectedArtefacts();
    }

    private sideArtefactChanged(side: DropdownOption) {
        this.side = side.name as Side;
        if (this.artefact!.side !== side.name) {
            this.onArtefactChanged(this.visibleArtefacts[0]);
        }
        this.fillImageSettings();
    }

    private getArtefactEditingData(index: number) {
        return this.artefactEditingDataList[index];
    }

    private showMessage(msg: string, type: string = 'info') {
        this.$toasted.show(msg, {
            type,
            position: 'top-right',
            duration: 7000
        });
    }

    private prepareNonSelectedArtefacts() {
        this.nonSelectedArtefacts = this.visibleArtefacts.filter(
            (artefact) => artefact !== this.artefact
        );
        this.nonSelectedMask = new Polygon();
        for (const artefact of this.nonSelectedArtefacts) {
            this.nonSelectedMask = Polygon.add(
                this.nonSelectedMask,
                artefact.mask.polygon
            );
        }
    }

    private sidebarClicked() {
        this.isActive = !this.isActive;
    }

    private modeChosen(val: DrawingMode): boolean {
        return (
            DrawingMode[val].toString() ===
            this.params.drawingMode.toString()
        );
    }

    private getArtefactColor(art: Artefact) {
        const idx = this.artefacts.indexOf(art);
        if (idx === -1) {
            console.error("Can't locate artefact in this.artefacts");
            throw new Error("Can't locate artefact in this.artefacts");
        }

        return ImagedObjectEditor.colors[idx % ImagedObjectEditor.colors.length];
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
.overlay-image {
    position: absolute;
    transform-origin: top left;
}
.overlay-artefact {
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
#zoom-div {
    position: absolute;
}
#rotate-dev {
    transform-origin: top left;
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
