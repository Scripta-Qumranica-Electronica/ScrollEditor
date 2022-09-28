<template>
    <div>
        <div v-if="waiting" class="col">
            <Waiting></Waiting>
        </div>

        <div
            v-if="!waiting && imagedObject"
            id="imaged-object-grid"
            ref="imagedObjectGrid"
        >
            <imaged-object-editor-toolbar
                id="imaged-object-toolbar"
                :imagedObject="imagedObject"
                :artefacts="visibleArtefacts"
                :artefact="artefact"
                :artefactId="artefactId"
                :side="side"
                :status-indicator="operationsManager"
                :modes="editList"
                @onSideArtefactChanged="sideArtefactChanged($event)"
            >
                <toolbox>
                    <b-btn
                        v-if="canEdit"
                        v-b-modal.modal="'newModal'"
                        variant="outline-secondary"
                        class="btn"
                        >{{ $t('misc.new') }}</b-btn
                    >
                </toolbox>
            </imaged-object-editor-toolbar>
            <div id="imaged-object-title" v-if="imagedObject">
                {{ imagedObject.id }}
                <edition-icons :edition="edition" :show-text="true" />
            </div>
            <div id="imaged-object-container">
                <zoomer
                    class="img-obj-container"
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
                                    removeColor ? 'none' : getArtefactColor(art)
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
            <resize-bar
                v-if="displayResizeBar"
                :gridElement="$refs.imagedObjectGrid"
                storageKey="image-object-left-pane-width"
            ></resize-bar>
            <div id="imaged-object-artefacts">
                <div
                    v-for="art in visibleArtefacts"
                    :key="art.id"
                    :class="{
                        selectedRow: art.id === artefact.id,
                    }"
                >
                    <b-row class="py-2">
                        <b-col class="col-2 col-xl-3 col-lg-2 pl-4 pt-1">
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
                        <b-col class="col-5 col-xl-4 col-lg-4 col-md-6">
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
                        <b-col
                            class="col-4 col-xl-5 col-lg-5 col-md-4 mr-0 px-0"
                        >
                            <div v-if="canEdit">
                                <b-button
                                    v-if="renameInputActive !== art"
                                    class="btn btn-sm mb-1"
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
                                        !renaming && renameInputActive === art
                                    "
                                    class="btn btn-sm"
                                    :disabled="!art.name"
                                    @click="onRename"
                                    >Rename</b-button
                                >
                                <b-button
                                    v-if="renameInputActive === art && renaming"
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
                                    class="btn btn-sm ml-2 mb-1"
                                    @click="onDeleteArtefact(art)"
                                    >Delete</b-button
                                >
                            </div>
                        </b-col>
                    </b-row>
                </div>
            </div>
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
    ModeButtonInfo,
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
import EditionIcons from '@/components/cues/edition-icons.vue';
import { ImagedObjectState } from '../../state/imaged-object';
import Toolbox from '@/components/toolbars/toolbox.vue';
import ResizeBar from '@/components/misc/resizeBar.vue';

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
        toolbox: Toolbox,
        'resize-bar': ResizeBar,
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

    public errorMessage: string = '';
    public newArtefactName: string = '';
    private artefactService = new ArtefactService();
    // private params = new ImagedObjectEditorParams();
    public artefactId: number = -1;
    public renaming = false;
    public operationsManager =
        new OperationsManager<ImagedObjectEditorOperation>(this);
    public side: Side = 'recto';
    public renameInputActive: Artefact | null = null;
    public waiting: boolean = true;
    public displayResizeBar: boolean = false;
    public masterImage?: IIIFImage | null = null;
    private initialMask = new Polygon();
    private nonSelectedMask = new Polygon();

    public async saveEntities(
        ops: ImagedObjectEditorOperation[]
    ): Promise<boolean> {
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
    public get params(): ImagedObjectEditorParams {
        return this.imagedObjectState.params || new ImagedObjectEditorParams();
    }
    public get canCreate(): boolean {
        return this.newArtefactName.trim().length > 0;
    }
    public newModalShown() {
        // this.waiting = true;
        (this.$refs.newArtefactName as any).focus();
    }

    // moved code to created() from mounted() {
    // in order to have the masterImage and other items
    // (i.e this.artefactId ) ready before mounted
    // for the <zoomed...><svg> ... part
    // and prevent errors of undefined parts
    // occuring during render befor mounted,
    // e.g. selectedRow: art.id === artefact.id returns undefined

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
            this.masterImage = stack?.master;

            if (this.visibleArtefacts.length) {
                this.onArtefactChanged(this.visibleArtefacts[0]);

                // Remove this because it will happen in onArtefactChanged function.
                this.initialMask = this.artefact!.mask;
            } else {
                this.artefactId = -1;
                this.initialMask = new Polygon();
            }
        } finally {
            this.waiting = false;
            this.$nextTick(() => {
                this.displayResizeBar = true;
            });
        }

        this.fillImageSettings();
    }

    public mounted() {
        this.$state.operationsManager = this.operationsManager;
    }

    public destroyed() {
        this.$state.operationsManager = null;
    }

    public get artefact(): Artefact | undefined {
        const artefact = this.artefacts.find((x) => x.id === this.artefactId);
        return artefact;
    }

    private get artefacts(): Artefact[] {
        return this.imagedObject!.artefacts || [];
    }

    public get imagedObject(): ImagedObject | null {
        return this.$state.imagedObjects.current;
    }

    private get editionId(): number {
        return parseInt(this.$route.params.editionId);
    }

    public get edition(): EditionInfo | null {
        return this.$state.editions.current;
    }

    public get removeColor() {
        return this.params.highLight === false;
    }

    public get canEdit(): boolean {
        return this.$state.editions.current?.permission?.mayWrite || false;
    }

    public get visibleArtefacts(): Artefact[] {
        return this.artefacts.filter((item) => item.side === this.side);
    }

    public get imageWidth(): number {
        return this.masterImage!.width;
    }

    public get imageHeight(): number {
        return this.masterImage!.height;
    }

    public get actualWidth(): number {
        return (
            (this.rotationAngle % 180 ? this.imageHeight : this.imageWidth) *
            this.zoomLevel
        );
    }

    public get actualHeight(): number {
        return (
            (this.rotationAngle % 180 ? this.imageWidth : this.imageHeight) *
            this.zoomLevel
        );
    }

    private get rotationAngle(): number {
        return ((this.params.rotationAngle % 360) + 360) % 360;
    }

    public get zoomLevel(): number {
        return this.params.zoom;
    }

    public get transform(): string {
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
            translate = `translate(${-bandWidth}, ${bandWidth})`;
        }

        const scale = `scale(${this.zoomLevel})`;

        return `${scale} ${translate} ${rotate}`;
    }

    public get editList(): ModeButtonInfo[] {
        if (this.canEdit) {
            return [
                {
                    icon: 'pen',
                    val: 'DRAW',
                    title: this.$t('misc.draw'),
                },
                {
                    icon: 'eraser',
                    val: 'ERASE',
                    title: this.$t('misc.erase'),
                },
            ];
        }
        return [];
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
        } catch (err: any) {
            this.errorMessage = err;
        } finally {
            this.newArtefactName = '';
            this.waiting = false;
        }
    }

    public get isErasing() {
        return this.params.drawingMode === DrawingMode.ERASE;
    }

    public onNewZoom(event: ZoomEventArgs) {
        this.params.zoom = event.zoom;
    }

    private editingModeChanged(val: any) {
        (this as any).params.drawingMode = DrawingMode[val];
    }

    public inputRenameChanged(art: Artefact | undefined) {
        this.renameInputActive = art ? art : null;
    }

    public onArtefactChanged(art: Artefact) {
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

    public async onRename() {
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
    public onNewPolygon(poly: Polygon) {
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

    public sideArtefactChanged(side: DropdownOption) {
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

    public getArtefactColor(art: Artefact) {
        const idx = this.visibleArtefacts.indexOf(art);
        if (idx === -1) {
            console.error("Can't locate artefact in this.artefacts");
            // throw new Error("Can't locate artefact in this.artefacts");
        }

        return ImagedObjectEditor.colors[
            idx % ImagedObjectEditor.colors.length
        ];
    }

    public async onDeleteArtefact(art: Artefact) {
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
@import '@/assets/styles/_classes.scss';

.header-actions {
    background-color: $white;
}

#imaged-object-grid {
    @extend .editor;
    /* margin-right: 5%;
    margin-left: 5%; */
    /* height: calc(100vh - 95px); */
    display: grid;
    grid-template-columns: 70% 1fr 30%;
    grid-template-rows: $toolbar-height 70px 1fr;
}

#imaged-object-toolbar {
    grid-column: 1 / span 3;
    grid-row: 1 / 3;
}

#imaged-object-title {
    grid-column: 1 / span 2;
    grid-row: 2/3;
    text-align: center;
}

#imaged-object-container {
    grid-column: 1/2;
    grid-row: 3/4;
    height: 100%;
    width: 100%;
    overflow: auto;

    .img-obj-container {
        display: flex;
        flex-direction: row;
        align-items: stretch;
        justify-content: stretch;

        & > svg {
            flex-shrink: 0;
            flex-grow: 1;
        }
    }
}

#imaged-object-artefacts {
    grid-column: 3/3;
    grid-row: 3/3;
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
    margin-top: 0.5rem;

    max-width: 305vw;
    overflow: hidden;
}

.select-art-name {
    cursor: pointer;
}

@media (max-width: 1100px) {
    .editor-container {
        /* margin-top: 0.7rem;
        margin-bottom: 0.7rem; */
        /* padding-top: 3rem;
        margin-right: 0.7rem;
        padding-right: 0.3rem;
        margin-left: 0.7rem;
        padding-left: 2rem;*/
        height: calc(100vh - 90px);
        overflow: auto;
    }
}
</style>
