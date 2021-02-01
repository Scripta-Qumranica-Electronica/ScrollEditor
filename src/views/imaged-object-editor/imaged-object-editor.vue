<template>
    <div>
        <div v-if="waiting" class="col">
            <Waiting></Waiting>
        </div>
        <div v-if="!waiting && imagedObject" class="mb-3 header-actions">
            <b-row class="mx-4 py-2">
                <b-col class="col-lg-9 col-xl-8">
                    <edition-header></edition-header>
                </b-col>
                <b-col class="col-2 mt-2">
                    <div class="btn-tf">
                        <b-button
                            v-for="mode in editList"
                            :key="mode.val"
                            @click="editingModeChanged(mode.val)"
                            :pressed="modeChosen(mode.val)"
                            class="sidebarCollapse mr-4 pMt-2"
                            v-b-tooltip.hover.bottom
                            :title="mode.title"
                        >
                            <i :class="mode.icon"></i>
                        </b-button>
                    </div>
                </b-col>
                <b-col class="p-3 col-2">
                    <div>{{ saveStatusMessage }}</div>
                </b-col>
            </b-row>
        </div>
        <div v-if="!waiting && imagedObject" class="mt-4 editor-container">
            <b-row align-v="center" class="border-bottom no-gutters">
                <b-col class="col-lg-9 col-xl-9">
                    <imaged-object-editor-toolbar
                        :imagedObject="imagedObject"
                        :artefacts="visibleArtefacts"
                        :artefact="artefact"
                        :artefactId="artefactId"
                        :side="side"
                        :status-indicator="operationsManager"
                        @undo="onUndo($event)"
                        @redo="onRedo($event)"
                        @onSideArtefactChanged="sideArtefactChanged($event)"
                    ></imaged-object-editor-toolbar>
                </b-col>
                <div class="col-lg-3 col-xl-3">
                    <b-button-group class="btn-sm">
                        <b-button
                            class="mr-1"
                            :disabled="!canUndo"
                            @click="onUndo()"
                            >Undo</b-button
                        >
                        <b-button :disabled="!canRedo" @click="onRedo()"
                            >Redo</b-button
                        >
                    </b-button-group>

                    <b-btn
                        v-if="canEdit"
                        v-b-modal.modal="'newModal'"
                        class="btn btn-sm ml-2 btn-outline"
                        >{{ $t('misc.new') }}</b-btn
                    >
                </div>
            </b-row>
            <b-row no-gutters>
                <b-col cols="8">
                    <div class="image-obj-container-height">
                        <div class="img-obj-container h-100" ref="infoBox">
                            <div id="imaged-object-title" v-if="imagedObject">
                                {{ imagedObject.id }}
                                <edition-icons
                                    :edition="edition"
                                    :show-text="true"
                                />
                            </div>
                            <zoomer
                                v-if="masterImage"
                                :zoom="zoomLevel"
                                @new-zoom="onNewZoom($event)"
                            >
                                <svg
                                    class="overlay"
                                    :height="actualHeight"
                                    :width="actualWidth"

                                    :viewBox="`0 0 ${actualWidth} ${actualHeight}`"
                                >
                                    <!-- Coordinate system is in the displayed image size (0,0) - (actualWidth,actualHeight) with rotation -->
                                    <g
                                        v-if="artefact"
                                        :transform="transform"
                                        id="transform-root"
                                    >
                                        <!-- Coordinate system is in master image coordinates -->
                                        <image-layer
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
                                            :color="
                                                removeColor
                                                    ? 'none'
                                                    : getArtefactColor(art)
                                            "
                                        />
                                        <boundary-drawer
                                            v-if="canEdit && artefact"
                                            :color="
                                                isErasing
                                                    ? 'black'
                                                    : getArtefactColor(artefact)
                                            "
                                            transform-root-id="transform-root"
                                            @new-polygon="onNewPolygon($event)"
                                        />
                                    </g>
                                </svg>
                            </zoomer>
                        </div>
                    </div>
                </b-col>
                <b-col class="pt-3 col-rename-art" cols="4" >
                    <div
                        v-for="art in visibleArtefacts"
                        :key="art.id"
                        :class="{
                            selectedRow: art.id === artefact.id,
                        }"
                    >
                        <b-row class="py-2">
                            <b-col class="col-lg-3 col-xl-4 pl-4 pt-1">
                                <span
                                    v-if="renameInputActive !== art"
                                    :class="{
                                        selected: art.id === artefact.id,
                                    }"
                                    @click="onArtefactChanged(art)"
                                    class="rename-art"
                                    :style="{
                                        color: getArtefactColor(art),
                                        backgroundColor: getArtefactColor(art),
                                    }"
                                >
                                    &nbsp;
                                </span>
                            </b-col>
                            <b-col class="col-lg-3 col-xl-3">
                                <span
                                    v-if="renameInputActive !== art"
                                    :class="{
                                        selected: art.id === artefact.id,
                                    }"
                                    class="select-art-name"
                                    @click="onArtefactChanged(art)"
                                    >{{ art.name }}</span
                                >
                            </b-col>
                            <b-col class="col-lg-6 col-xl-5 px-0">
                                <div v-if="canEdit">
                                    <b-button
                                        v-if="renameInputActive !== art"
                                        class="btn btn-sm"
                                        id="rename"
                                        @click="inputRenameChanged(art)"
                                        >Rename</b-button
                                    >
                                    <input
                                        v-if="renameInputActive === art"
                                        v-model="art.name"
                                    />
                                    <b-button
                                        v-if="
                                            !renaming &&
                                            renameInputActive === art
                                        "
                                        class="btn btn-sm"
                                        :disabled="!art.name"
                                        @click="onRename(art)"
                                        >Rename</b-button
                                    >
                                    <b-button
                                        v-if="
                                            renameInputActive === art &&
                                            renaming
                                        "
                                        disabled
                                        class="disable btn btn-sm"
                                    >
                                        Renaming...
                                        <font-awesome-icon
                                            icon="spinner"
                                            spin
                                        ></font-awesome-icon>
                                    </b-button>
                                    <b-button
                                        class="btn btn-sm ml-2"
                                        @click="onDeleteArtefact(art)"
                                        >Delete</b-button
                                    >
                                </div>
                            </b-col>
                        </b-row>
                    </div>
                </b-col>
            </b-row>
        </div>
        <b-modal
            id="newModal"
            ref="newArtRef"
            :title="$t('home.newArtefact')"
            @shown="newModalShown"
            @ok="newArtefact"
            :ok-title="$t('misc.create')"
            :cancel-title="$t('misc.cancel')"
            :ok-disabled="waiting || !canCreate"
            :cancel-disabled="waiting"
        >
            <form @submit.stop.prevent="newArtefact">
                <b-form-group
                    :label="$t('home.newArtefactName')"
                    label-for="newArtefactName"
                >
                    <b-form-input
                        ref="newArtefactName"
                        id="newName"
                        v-model="newArtefactName"
                        type="text"
                        @keyup.enter="newArtefact"
                        required
                        :placeholder="$t('home.newArtefactName')"
                    ></b-form-input>
                </b-form-group>
                <p v-if="waiting">
                    {{ $t('home.creatingNewArtefact') }}...
                    <font-awesome-icon icon="spinner" spin></font-awesome-icon>
                </p>
                <p class="text-danger" v-if="errorMessage">
                    {{ errorMessage }}
                </p>
            </form>
        </b-modal>
    </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import Waiting from '@/components/misc/Waiting.vue';
import ArtefactService from '@/services/artefact';
import {
    DrawingMode,
    EditorParamsChangedArgs,
    ImagedObjectEditorParams,
} from './types';
import Zoomer, { ZoomEventArgs } from '@/components/misc/zoomer.vue';
import BoundaryDrawer from '@/components/polygons/boundary-drawer.vue';
import { IIIFImage } from '@/models/image';
import ImageLayer from '@/views/imaged-object-editor/image-layer.vue';
import ArtefactLayer from '@/views/imaged-object-editor/artefact-layer.vue';
import { EditionInfo } from '@/models/edition';
import { Artefact } from '@/models/artefact';
import { ImagedObject } from '@/models/imaged-object';
import { OperationsManager, SavingAgent } from '@/utils/operations-manager';
import { ArtefactEditorOperation } from '../artefact-editor/operations';
import { Side } from '@/models/misc';
import { ImagedObjectEditorOperation } from './operations';
import { Polygon } from '@/utils/Polygons';
import { normalizeOpacity } from '@/components/image-settings/types';
import ImagedObjectEditorToolbar from './imaged-object-editor-toolbar.vue';
import { DropdownOption } from '@/utils/helpers';
import EditionHeader from '../edition/components/edition-header.vue';
import EditionIcons from '@/components/cues/edition-icons.vue';
import { ImagedObjectState } from '../../state/imaged-object';

@Component({
    name: 'imaged-object-editor',
    components: {
        Waiting,
        'image-layer': ImageLayer,
        'artefact-layer': ArtefactLayer,
        'boundary-drawer': BoundaryDrawer,
        'imaged-object-editor-toolbar': ImagedObjectEditorToolbar,
        zoomer: Zoomer,
        'edition-icons': EditionIcons,
        'edition-header': EditionHeader,
    },
})
export default class ImagedObjectEditor
    extends Vue
    implements SavingAgent<ImagedObjectEditorOperation> {
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
        'cadetBlue',
    ];

    private errorMessage: string = '';
    private newArtefactName: string = '';
    private artefactService = new ArtefactService();
    // private params = new ImagedObjectEditorParams();
    private artefactId: number = -1;
    private renaming = false;
    private operationsManager = new OperationsManager<ImagedObjectEditorOperation>(
        this
    );
    private side: Side = 'recto';
    private renameInputActive: Artefact | null = null;
    private waiting: boolean = false;
    private masterImage?: IIIFImage | null = null;
    private initialMask = new Polygon();
    private nonSelectedMask = new Polygon();

    public async saveEntities(
        ops: ImagedObjectEditorOperation[]
    ): Promise<boolean> {
        // if (!this.artefact) {
        //     throw new Error("Can't save if there is no artefact");
        // }

        for (const op of ops) {
            const id = op.getId();
            const artefact = this.artefacts.find((x) => x.id === id);
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
    public get imagedObjectState(): ImagedObjectState {
        return this.$state.imagedObject;
    }
    private get params(): ImagedObjectEditorParams {
        return this.imagedObjectState.params || new ImagedObjectEditorParams();
    }
    public get canCreate(): boolean {
        return this.newArtefactName.trim().length > 0;
    }
    public newModalShown() {
        // this.waiting = true;
        (this.$refs.newArtefactName as any).focus();
    }

   // moved code to created()
   // from  private async mounted() {
   // in order to have the masterImage ready before mounted
   // for the <zoomed...><svg> ... part

    private async created() {
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

            // Load manifests of all images of both sides
            const rectoStack = this.imagedObject.getImageStack('recto');
            const rectoImages = rectoStack?.images || [];

            const versoStack = this.imagedObject.getImageStack('verso');
            const versoImages = versoStack?.images || [];

            const images = [...rectoImages, ...versoImages];
            const promises = images.map((img) =>
                this.$state.prepare.imageManifest(img)
            );
            await Promise.all(promises);

            // Get the current master image
            const stack = this.imagedObject.getImageStack(this.side)!;
            this.masterImage = (undefined === stack) ? null : stack.master;

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


    private get artefact(): Artefact | undefined {
        const artefact = this.artefacts.find((x) => x.id === this.artefactId);
        return artefact;
    }

    private get artefacts(): Artefact[] {
        return this.imagedObject!.artefacts || [];
    }

    private get imagedObject(): ImagedObject | null {
        return this.$state.imagedObjects.current;
    }

    private get editionId(): number {
        return parseInt(this.$route.params.editionId);
    }

    private get edition(): EditionInfo | null {
        return this.$state.editions.current;
    }

    private get removeColor() {
        return this.params.highLight === false;
    }

    private get canEdit(): boolean {
        return this.$state.editions.current?.permission.mayWrite || false;
    }

    private get visibleArtefacts(): Artefact[] {
        return this.artefacts.filter((item) => item.side === this.side);
    }

    private get imageWidth(): number {
        return this.masterImage!.width;
    }

    private get imageHeight(): number {
          return this.masterImage!.height;
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

    private get zoomLevel(): number {
        return this.params.zoom;
    }

    private get transform(): string {
        // Rotation
        const rotate = `rotate(${this.rotationAngle}, ${this.imageWidth / 2}, ${
            this.imageHeight / 2
        })`;

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

    private get editList(): any[] {
        if (this.canEdit) {
            return [
                {
                    icon: 'fa fa-pencil',
                    val: 'DRAW',
                    title: this.$t('misc.draw'),
                },
                {
                    icon: 'fa fa-trash',
                    val: 'ERASE',
                    title: this.$t('misc.cancel'),
                },
            ];
        }
        return [];
    }

    public get canUndo(): boolean {
        return this.operationsManager.canUndo;
    }

    public get canRedo(): boolean {
        return this.operationsManager.canRedo;
    }

    public onUndo() {
        this.operationsManager.undo();
    }

    public onRedo() {
        this.operationsManager.redo();
    }

    public get saveStatusMessage() {
        if (this.operationsManager.isSaving) {
            return 'Saving...';
        }
        if (this.operationsManager.isDirty) {
            return 'Save pending';
        }
        return 'Scroll Saved';
    }

    public async newArtefact() {
        this.newArtefactName = this.newArtefactName.trim();

        let newArtefact = {} as Artefact;
        this.waiting = true;
        this.errorMessage = '';
        try {
            newArtefact = await this.artefactService.createArtefact(
                this.editionId,
                this.imagedObject!,
                this.newArtefactName,
                this.side as Side
            );

            (this.$refs.newArtRef as any).hide();
            this.onArtefactChanged(newArtefact);

            this.editingModeChanged('DRAW');
            this.$emit('create', newArtefact);
        } catch (err) {
            this.errorMessage = err;
        } finally {
            this.newArtefactName = '';
            this.waiting = false;
        }
    }

    private get isErasing() {
        return this.params.drawingMode === DrawingMode.ERASE;
    }

    private onNewZoom(event: ZoomEventArgs) {
        this.params.zoom = event.zoom;
    }

    private editingModeChanged(val: any) {
        (this as any).params.drawingMode = DrawingMode[val];
    }

    private modeChosen(val: DrawingMode): boolean {
        return (
            DrawingMode[val].toString() === this.params.drawingMode.toString()
        );
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
    // private onParamsChanged(evt: EditorParamsChangedArgs) {
    //     this.params = evt.params; // This makes sure a change is triggered in child components
    // }
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
                duration: 5000,
            });
            return;
        }

        console.log(this.artefact!.mask.svg, newPolygon.svg, 'hasChanged');
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

    private sideArtefactChanged(side: DropdownOption) {
        this.side = side.name as Side;
        if (this.artefact!.side !== side.name && this.visibleArtefacts.length) {
            this.onArtefactChanged(this.visibleArtefacts[0]);
        }
        this.fillImageSettings();
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
                            normalizedOpacity: 1,
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

    private showMessage(msg: string, type: string = 'info') {
        this.$toasted.show(this.$tc(msg), {
            type,
            position: 'top-right',
            duration: 7000,
        });
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
    margin-right: 5%;
    margin-left: 5%;
    height: calc(100vh - 180px);
}
.editor-actions {
    height: 70px;
}

.img-obj-container {
    text-align: center;
}
.image-obj-container-height {
    height: calc(100vh - 275px);
}
span.selected {
    font-weight: bold;
}
.selectedRow {
    border: 2px solid #7884a1;
}
.rename-art {
    border: solid 3px;
    height: 16px;
    width: 100%;
    display: inline-block;
    margin-right: 4px;
    cursor: pointer;
}
.col-rename-art {
    height: calc(100vh - 315px);
    overflow: auto;
}
.select-art-name {
    cursor: pointer;
}
</style>
