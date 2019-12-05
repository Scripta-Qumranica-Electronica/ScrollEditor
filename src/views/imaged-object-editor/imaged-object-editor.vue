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
                    <zoomer :zoom="zoomLevel" @new-zoom="onNewZoom($event)">
                        <svg class="overlay"
                            :width="actualWidth"
                            :height="actualHeight"
                            :viewBox="`0 0 ${actualWidth} ${actualHeight}`">
                            <!-- Coordinate system is in the displayed image size (0,0) - (actualWidth,actualHeight) with rotation -->
                            <g :transform="transform" id="transform-root">
                                <!-- Coordinate system is in master image coordinates -->
                                <image-layer
                                    :width="imageWidth"
                                    :height="imageHeight"
                                    :params="params"
                                    :editable="canEdit"
                                    :clipping-mask="artefact.mask.polygon"
                                ></image-layer>
                                <artefact-layer
                                    :selected="art.id === artefact.id"
                                    v-for="art in visibleArtefacts"
                                    :artefact="art"
                                    :key="art.id"
                                    :color="getArtefactColor(art)"
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
    ArtefactEditingData,
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

@Component({
    name: 'imaged-object-editor',
    components: {
        Waiting,
        'imaged-object-menu': ImagedObjectMenu,
        'image-layer': ImageLayer,
        'artefact-layer': ArtefactLayer,
        'boundary-drawer': BoundaryDrawer,
        'zoomer': Zoomer,
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
    private artefact: Artefact | null = null;
    private initialMask = new Polygon();
    private params = new ImagedObjectEditorParams();
    private saving = false;
    private renaming = false;
    private renameInputActive: Artefact | null = null;
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
        return (this.rotationAngle % 180 ? this.imageHeight : this.imageWidth) * this.zoomLevel;
    }

    private get actualHeight(): number {
        return (this.rotationAngle % 180 ? this.imageWidth : this.imageHeight) * this.zoomLevel;
    }

    private get rotationAngle(): number {
        return ((this.params.rotationAngle % 360) + 360) % 360;
    }

    private get transform(): string {
        // Rotation
        const rotate = `rotate(${this.rotationAngle}, ${this.imageWidth / 2}, ${this.imageHeight / 2})`;

        // If the rotation is by 90 or 270 degrees, the image need to be moved a little bit.
        // Since the image's width is larger than its height, rotation by 90 degrees (or 270) results in a
        // white band to the left of the rotated image. The top of the image is cut-off by exactly the
        // width of the white band.
        let translate = '';
        if (this.rotationAngle % 180) { // 90 or 270
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
                this.artefact = null;
                this.initialMask = new Polygon();
            }
        } finally {
            this.waiting = false;
        }

        this.fillImageSettings();
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
            }
        }
    }

    private optimizeArtefacts() {
        this.artefacts = this.imagedObject!.artefacts || [];
    }

    private editingModeChanged(val: any) {
        (this as any).params.drawingMode = DrawingMode[val];
    }

    private onParamsChanged(evt: EditorParamsChangedArgs) {
        this.params = evt.params; // This makes sure a change is triggered in child components
    }

    private onNewZoom(event: ZoomEventArgs) {
        console.log(`imaged-object-editor setting zoom to ${event.zoom}`);
        this.params.zoom = event.zoom;
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
                this.artefact = null;
                this.initialMask = new Polygon();
            }
        } catch (err) {
            console.error(err);
            this.showMessage('Delete artefact failed', 'error');
        }
    }

    private inputRenameChanged(art: Artefact | undefined) {
        this.renameInputActive = art ? art : null;
    }

    private onArtefactChanged(art: Artefact) {
        console.log(`onArtefactChanged to ${art.name} (${art.id})`);
        this.artefact = art;
        const index = this.artefacts.indexOf(art); // index artefact in artefact list.
        this.artefactEditingData = this.getArtefactEditingData(index);

        this.nonSelectedMask = new Polygon();
        for (const artefact of this.visibleArtefacts) {
            if (artefact !== art) {
                this.nonSelectedMask = Polygon.add(this.nonSelectedMask, artefact.mask.polygon);
            }
        }
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
        const idx = this.visibleArtefacts.indexOf(art);
        if (idx === -1) {
            console.error("Can't locate artefact in this.artefacts");
            throw new Error("Can't locate artefact in this.artefacts");
        }

        return ImagedObjectEditor.colors[idx % ImagedObjectEditor.colors.length];
    }

    private get isErasing() {
        return this.params.drawingMode === DrawingMode.ERASE;
    }

    private onNewPolygon(poly: Polygon) {
        let newPolygon: Polygon;

        if (this.isErasing) {
            newPolygon = Polygon.subtract(this.artefact!.mask.polygon, poly);
        } else {
            newPolygon = Polygon.add(this.artefact!.mask.polygon, poly);
        }

        // Check if the new mask intersects with a non selected artefact mask
        const intersection = Polygon.intersect(
            newPolygon,
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

        const changeOperation = {
            prevMask: this.artefact!.mask.polygon,
        } as MaskChangeOperation;

        // Calculate the new masks (the unoptimized mask is used by the ROI Canvas)
        this.artefact!.mask.polygon = newPolygon;
        this.artefactEditingData.dirty = true;

        changeOperation.newMask = this.artefact!.mask.polygon;

        if (this.artefactEditingData.undoList.length >= 50) {
            this.artefactEditingData.undoList.slice(1);
        }

        this.artefactEditingData.undoList.push(changeOperation);
        this.artefactEditingData.redoList = [];
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
