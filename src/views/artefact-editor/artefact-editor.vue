<template>
    <div class="wrapper" id="artefact-editor">
        <div v-if="waiting" class="col">
            <waiting></waiting>
        </div>

        <div
            id="sidebar"
            class="artefact-menu-div"
            v-if="!waiting && artefact"
            :class="{ sidebar : isActiveSidebar }"
        >
            <artefact-side-menu
                :artefact="artefact"
                :params="params"
                :saving="saving"
                :status-indicator="operationsManager"
                @paramsChanged="onParamsChanged($event)"
                @undo="onUndo($event)"
                @redo="onRedo($event)"
            ></artefact-side-menu>
        </div>

        <div :class="{ sidebar: isActiveSidebar, text: isActiveText }" v-if="!waiting && artefact">
            <div class="row" id="artefact-and-buttons">
                <div class="buttons-div btn-menu-Artefact">
                    <b-button
                        type="button"
                        class="sidebarCollapse"
                        @click="sidebarClicked()"
                        v-b-tooltip.hover.bottom
                        :title="$t('misc.collapsedsidebarArtefact')"
                    >
                        <i class="fa fa-align-justify"></i>
                    </b-button>
                </div>

                <div
                    class="artefact-container"
                    :class="{ sidebar: isActiveSidebar, text: isActiveText }"
                    id="info-box"
                    ref="infoBox"
                >
                    <div class="sign-wheel sign-wheel-position">
                        {{artefact.name}}
                        <edition-icons :edition="edition" :show-text="true" />
                        <sign-wheel v-if="selectedSignsInterpretation.length" :line="selectedLine" />
                    </div>
                    <b-button
                        type="button"
                        v-show="$bp.between('sm', 'lg')"
                        @click="nextLine()"
                        class="btn-next-line"
                    >
                        <i class="fa fa-arrow-left"></i>
                    </b-button>
                    <zoomer
                        :zoom="zoomLevel"
                        :angle="rotationAngle"
                        @new-zoom="onNewZoom($event)"
                        @new-rotate="onNewRotate($event)"
                    >
                        <svg
                            class="overlay"
                            :width="actualWidth"
                            :height="actualHeight"
                            :viewBox="actualBoundingBox"
                        >
                            <!-- The SVG is in the coordinates of the master image, scaled down by the zoom factor. We only show
                            the bounding box of the artefact and not all of the surroundings, hence the viewBox attribute-->
                            <g :transform="transform" id="transform-root">
                                <!-- Rotate and scale the content -->
                                <!-- This group's coordinate system is the master image's -->
                                <image-layer
                                    :width="imageWidth"
                                    :height="imageHeight"
                                    :params="params"
                                    :clipping-mask="artefact.mask"
                                    :boundingBox="artefact.mask.getBoundingBox()"
                                />
                                <roi-layer :rois="visibleRois" @roi-clicked="onRoiClicked($event)" />
                                <boundary-drawer
                                    v-show="isDrawingEnabled && this.mode !== 'select'"
                                    :mode="mode"
                                    transformRootId="transform-root"
                                    @new-polygon="onNewPolygon($event)"
                                />
                            </g>
                        </svg>
                    </zoomer>
                </div>
                <div class="buttons-div btn-tf">
                    <b-button
                        type="button"
                        class="sidebarCollapse"
                        @click="textClicked()"
                        v-b-tooltip.hover.bottom
                        :title="$t('misc.collapsedsidebar')"
                    >
                        <i class="fa fa-align-justify"></i>
                    </b-button>
                    <b-button
                        v-for="mode in [{icon: 'fa fa-pencil-square-o', val:'polygon' ,title: this.$t('misc.draw')}, {icon: 'fa fa-square-o', val: 'box', title: this.$t('misc.box')}]"
                        v-show="!readOnly"
                        :key="mode.val"
                        @click="onModeClick(mode.val)"
                        :pressed="mode === mode.val"
                        :disabled="!isDrawingEnabled"
                        class="sidebarCollapse"
                        v-b-tooltip.hover.bottom
                        :title="mode.title"
                    >
                        <i :class="mode.icon"></i>
                    </b-button>
                    <b-button
                        v-if="!readOnly"
                        type="button"
                        class="sidebarCollapse"
                        @click="onDeleteRoi()"
                        :disabled="!isDeleteEnabled"
                        v-b-tooltip.hover.bottom
                        :title="$t('misc.cancel')"
                    >
                        <i class="fa fa-trash"></i>
                    </b-button>
                    <b-button
                        v-if="!readOnly"
                        type="button"
                        @click="onAuto()"
                        :pressed="autoMode == true"
                        class="sidebarCollapse"
                        v-b-tooltip.hover.bottom
                        :title="$t('misc.auto')"
                    >
                        <i class="fa fa-play"></i>
                    </b-button>

                    <b-button
                        v-if="!readOnly"
                        type="button"
                        @click="onModeClick('select')"
                        :pressed="mode === 'select'"
                        class="sidebarCollapse"
                        v-b-tooltip.hover.bottom
                        :title="$t('misc.select')"
                    >
                        <i class="fa fa-mouse-pointer"></i>
                    </b-button>
                </div>
            </div>
        </div>
        <div
            id="text-right-sidebar"
            v-if="!waiting && artefact"
            :class="{ sidebar: isActiveSidebar, text: isActiveText }"
        >
            <text-side
                :artefact="artefact"
                @sign-interpretation-clicked="onSignInterpretationClicked($event)"
                @text-fragment-selected="initVisibleRois()"
                @text-fragments-loaded="initVisibleRois()"
            ></text-side>
            <si-attributes></si-attributes>
        </div>
    </div>
</template>

<script lang="ts">
import { Component, Prop, Vue, Mixins } from 'vue-property-decorator';
import Waiting from '@/components/misc/Waiting.vue';
import ArtefactImage from '@/views/artefact-editor/artefact-image.vue';
import { Artefact } from '@/models/artefact';
import EditionService from '@/services/edition';
import ArtefactService from '@/services/artefact';
import ArtefactSideMenu from '@/views/artefact-editor/artefact-side-menu.vue';
import TextSide from '@/views/artefact-editor/text-side.vue';
import SignCanvas from './SignCanvas.vue';
import SignOverlay from './SignOverlay.vue';
import {
    ArtefactEditorParams,
    ArtefactEditorParamsChangedArgs,
} from '@/views/artefact-editor/types';
import { ZoomRequestEventArgs } from '@/models/editor-params';
import { IIIFImage, ImageStack } from '@/models/image';
import { Position } from '@/models/misc';
import { ArtefactTextFragmentData } from '@/models/text';

import {
    ImageSetting,
    SingleImageSetting,
    normalizeOpacity,
} from '@/components/image-settings/types';
import {
    SignInterpretation,
    InterpretationRoi,
    Line,
    TextFragment,
} from '@/models/text';
import { Polygon } from '@/utils/Polygons';
import { ImagedObject } from '@/models/imaged-object';
import ImagedObjectService from '@/services/imaged-object';
import { BoundingBox } from '@/utils/helpers';
import ImageLayer from '@/views/artefact-editor/image-layer.vue';
import RoiLayer from '@/views/artefact-editor/roi-layer.vue';
import BoundaryDrawer, {
    ActionMode,
} from '@/components/polygons/boundary-drawer.vue';
import Zoomer, {
    ZoomEventArgs,
    RotateEventArgs,
} from '@/components/misc/zoomer.vue';
import TextService from '@/services/text';
import SignWheel from '@/views/artefact-editor/sign-wheel.vue';
import EditionIcons from '@/components/cues/edition-icons.vue';
import { EditionInfo } from '../../models/edition';
import {
    ArtefactEditorOperation,
    ArtefactEditorOperationType,
    ArtefactROIOperation,
    ArtefactRotateOperation,
} from './operations';
import { SavingAgent, OperationsManager } from '@/utils/operations-manager';
import { SetInterpretationRoiDTO } from '../../dtos/sqe-dtos';
import SiAttributes from './si-attributes.vue';

@Component({
    name: 'artefact-editor',
    components: {
        waiting: Waiting,
        'artefact-image': ArtefactImage,
        'artefact-side-menu': ArtefactSideMenu,
        'text-side': TextSide,
        'image-layer': ImageLayer,
        'roi-layer': RoiLayer,
        'boundary-drawer': BoundaryDrawer,
        zoomer: Zoomer,
        'sign-wheel': SignWheel,
        'edition-icons': EditionIcons,
        'si-attributes': SiAttributes,
    },
})
export default class ArtefactEditor extends Vue
    implements SavingAgent<ArtefactEditorOperation> {
    public params = new ArtefactEditorParams();
    // private selectedSignInterpretation: SignInterpretation | null = null;
    // private selectedInterpretationRoi: InterpretationRoi | null = null;
    private mode: ActionMode = 'box';
    private autoMode = false;

    private errorMessage = '';
    private waiting = true;
    private saving = false;
    private isActiveSidebar = false;
    private isActiveText = false;
    private imageStack: ImageStack | undefined = undefined;
    private boundingBox = new BoundingBox();
    private boundingBoxCenter = { x: 0, y: 0 } as Position;

    private artefactService = new ArtefactService();
    private textService = new TextService();
    private operationsManager = new OperationsManager<ArtefactEditorOperation>(
        this
    );

    private visibleRois: InterpretationRoi[] = [];

    protected get artefact() {
        return this.$state.artefacts.current!;
    }
    public get artefactEditor() {
        return this.$state.artefactEditor;
    }
    public get selectedSignsInterpretation(): SignInterpretation[] {
        return this.artefactEditor.selectedSignsInterpretation;
    }

    public get selectedInterpretationRoi(): InterpretationRoi | null {
        return this.artefactEditor.selectedInterpretationRoi;
    }

    public async saveEntities(
        ops: ArtefactEditorOperation[]
    ): Promise<boolean> {
        const as = new ArtefactService();

        this.saving = true;
        try {
            const appliedRotation = await this.saveRotation();
            const appliedROIs = await this.saveROIs();
        } catch (e) {
            console.error("Can't save arterfacts to server", e);
            return false;
        }
        this.saving = false;

        return true;
    }

    public onNewPolygon(poly: Polygon) {
        if (!this.selectedSignsInterpretation.length) {
            console.error("Can't add ROI with no selected sign");
            return;
        }

        const bbox = poly.getBoundingBox();
        const normalized = Polygon.offset(poly, -bbox.x, -bbox.y);
        const roi = InterpretationRoi.new(
            this.artefact,
            this.artefactEditorState.singleSelectedSi!,
            normalized,
            bbox
        );

        const placedRoi = this.placeRoi(roi);

        const op: ArtefactROIOperation = new ArtefactROIOperation(
            this.artefact.id,
            'draw',
            placedRoi.clone()
        );
        this.onNewOperation(op);
        if (this.autoMode) {
            // Find the next sign interpretation with a character - that can be mapped.
            this.playSound('/qumran_hum.mp3');
            setTimeout(this.nextSign, 1500);
        }
    }

    public placeRoi(roi: InterpretationRoi) {
        let newRoi = this.$state.interpretationRois.get(roi.id);
        if (!newRoi) {
            newRoi = roi;
            this.$state.interpretationRois.put(newRoi);
            // const roiDTO: SetInterpretationRoiDTO = {
            //     artefactId: roi.artefactId,
            //     shape: roi.shape.wkt,
            //     translate: roi.position,
            //     stanceRotation: roi.rotation,
            //     exceptional: roi.exceptional,
            //     valuesSet: roi.valuesSet,
            //     signInterpretationId: roi.signInterpretationId
            // }
            // newRoi = new InterpretationRoi(roiDTO);
        }
        // For now the status 'update' doesn't do the save, we put 'new' to save it
        newRoi.status = 'new';
        const si = this.$state.signInterpretations.get(
            roi.signInterpretationId!
        );
        if (si) {
            si.rois.push(newRoi);
        }
        this.visibleRois.push(newRoi);
        this.$state.artefactEditor.selectRoi(newRoi);
        // this.artefactEditorState.toggleSelectSign(si, false);

        return newRoi;
    }
    public get artefactEditorState() {
        return this.$state.artefactEditor;
    }

    public removeRoi(roi: InterpretationRoi) {
        const roiBbox = roi.shape.getBoundingBox();
        const visibleRoi = this.visibleRois.find(
            (vRoi) =>
                vRoi.shape.getBoundingBox().x === roiBbox.x &&
                vRoi.shape.getBoundingBox().y === roiBbox.y &&
                vRoi.shape.getBoundingBox().width === roiBbox.width &&
                vRoi.shape.getBoundingBox().height === roiBbox.height
        );
        if (!visibleRoi) {
            console.error('Cannot find a ROI with the bounding box:', roiBbox);
            return;
        }
        const existedRoi = this.$state.interpretationRois.get(visibleRoi.id);
        if (existedRoi) {
            existedRoi.status = 'deleted';
        }
        const si = this.$state.signInterpretations.get(
            roi.signInterpretationId!
        );
        if (si) {
            si.deleteRoi(roi);
        }
        const visIndex = this.visibleRois.findIndex((r) => r.id === roi.id);
        this.visibleRois.splice(visIndex, 1);
        this.statusTextFragment(roi);

        this.artefactEditorState.selectRoi(null);
        this.artefactEditorState.selectedSignsInterpretation = [];
    }

    protected created() {
        this.$state.eventBus.on('roi-changed', this.initVisibleRois);
        this.$state.eventBus.on(
            'change-artefact-rotation',
            (angle: number) => (this.params.rotationAngle = angle)
        );
        this.$state.eventBus.on('remove-roi', this.removeRoi);
        this.$state.eventBus.on('place-roi', this.placeRoi);
    }

    protected destroyed() {
        this.$state.eventBus.off('roi-changed', this.initVisibleRois);
        this.$state.eventBus.off('change-artefact-rotation');
        this.$state.eventBus.off('remove-roi', this.removeRoi);
        this.$state.eventBus.off('place-roi', this.placeRoi);
    }

    protected async mounted() {
        this.waiting = true;
        if (this.$bp.between('sm', 'lg')) {
            this.isActiveSidebar = true;
        }
        await this.$state.prepare.artefact(
            parseInt(this.$route.params.editionId),
            parseInt(this.$route.params.artefactId)
        );
        const imagedObject = this.$state.imagedObjects.find(
            this.artefact.imagedObjectId
        );
        if (!imagedObject) {
            throw new Error(
                `Can't find imaged object ${this.artefact.imagedObjectId} belonging to artefact ${this.artefact.id}`
            );
        }
        this.imageStack =
            this.artefact.side === 'recto'
                ? imagedObject.recto
                : imagedObject.verso;
        if (!this.imageStack) {
            throw new Error(
                `ImagedObject ${this.artefact.imagedObjectId} doesn't contain the ` +
                    `${this.artefact.side} side even though artefact ${this.artefact.id} references it`
            );
        }
        await this.$state.prepare.imageManifest(this.imageStack.master);
        this.params.rotationAngle = this.artefact.placement.rotate || 0;
        this.fillImageSettings();
        this.calculateBoundingBox();
        await Promise.all(
            this.artefact.textFragments.map((tf: ArtefactTextFragmentData) =>
                this.$state.prepare.textFragment(this.artefact.editionId, tf.id)
            )
        );

        this.initVisibleRois();
        this.waiting = false;

        setTimeout(() => this.setFirstZoom(), 0);
    }

    private get edition(): EditionInfo {
        return this.$state.editions.current!;
    }
    private get imagedObject(): ImagedObject {
        return this.$state.imagedObjects.current!;
    }
    private get masterImage(): IIIFImage {
        return this.imageStack!.master;
    }
    private get zoomLevel(): number {
        return this.params.zoom;
    }
    private get readOnly(): boolean {
        return this.edition.permission.readOnly;
    }
    // On computer screen - Active means closed, for example sidebar active means the sidebar is closed.
    // On tablet screen - Active means opened.

    private get imageWidth(): number {
        return this.masterImage.width;
    }

    private get imageHeight(): number {
        return this.masterImage.height;
    }

    private get actualWidth(): number {
        return this.boundingBox.width * this.zoomLevel;
    }

    private get actualHeight(): number {
        return this.boundingBox.height * this.zoomLevel;
    }

    private get actualBoundingBox(): string {
        return (
            `${this.boundingBox.x * this.zoomLevel} ${
                this.boundingBox.y * this.zoomLevel
            } ` + `${this.actualWidth} ${this.actualHeight}`
        );
    }

    private get isDrawingEnabled() {
        return !!this.artefactEditorState.singleSelectedSi;
    }

    private get isDeleteEnabled() {
        return !!this.selectedInterpretationRoi;
    }

    private get rotationAngle(): number {
        return this.params.rotationAngle;
    }
    private statusTextFragment(roi: InterpretationRoi) {
        const si = this.$state.signInterpretations.get(
            roi.signInterpretationId!
        );
        if (si) {
            const tfId = si.sign.line.textFragment.textFragmentId;
            const visibleSIs = this.visibleRois.map((r) =>
                this.$state.signInterpretations.get(r.signInterpretationId!)
            );
            const visiblesTf = visibleSIs.map(
                (s) => s!.sign.line.textFragment.textFragmentId
            );

            const anyRoiOfSelectedTf = visiblesTf.some((tf) => tf === tfId);
            if (!anyRoiOfSelectedTf) {
                const tfToMove = this.artefact.textFragments.find(
                    (tf) => tf.id === tfId
                );
                if (tfToMove) {
                    tfToMove.certain = false;
                }
            }
        }
    }

    private setFirstZoom() {
        const infoBox = this.$refs.infoBox as Element;
        const height = infoBox.clientHeight;
        const width = infoBox.clientWidth;
        this.params.zoom = Math.min(
            height / this.boundingBox.height,
            width / this.boundingBox.width
        );
    }

    private onDeleteRoi() {
        const roi = this.selectedInterpretationRoi;
        const si = this.selectedSignsInterpretation;
        if (!roi || !si) {
            console.error("Can't delete an ROI if nothing is selected");
            return;
        }
        const op: ArtefactROIOperation = new ArtefactROIOperation(
            this.artefact.id,
            'erase',
            roi.clone()
        );
        this.onNewOperation(op);

        this.removeRoi(roi);
    }
    private onNewZoom(event: ZoomEventArgs) {
        this.params.zoom = event.zoom;
    }
    private onNewRotate(event: RotateEventArgs) {
        this.params.rotationAngle = event.rotate;
    }

    private get transform(): string {
        const zoom = `scale(${this.zoomLevel})`;
        const rotate = `rotate(${this.rotationAngle}  ${this.boundingBoxCenter.x}  ${this.boundingBoxCenter.y})`;

        return `${zoom} ${rotate}`;
    }

    private get selectedLine(): Line | null {
        if (!this.artefactEditorState.singleSelectedSi) {
            return null;
        }

        return this.artefactEditorState.singleSelectedSi!.sign.line;
    }

    private nextSign() {
        let newIndex =
            this.artefactEditorState.singleSelectedSi!.sign.indexInLine + 1;
        while (newIndex < this.selectedLine!.signs.length) {
            const newSI = this.selectedLine!.signs[newIndex]
                .signInterpretations[0];
            if (newSI.character && !newSI.isReconstructed) {
                this.artefactEditorState.toggleSelectSign(newSI, false);
                break;
            }
            newIndex++;
        }
    }

    private playSound(sound: string) {
        if (sound) {
            const audio = new Audio(sound);
            audio.play();
        }
    }

    private sidebarClicked() {
        this.isActiveSidebar = !this.isActiveSidebar;
    }

    private textClicked() {
        this.isActiveText = !this.isActiveText;
    }

    private nextLine() {
        if (this.selectedLine) {
            const linesArray = this.selectedLine.textFragment.lines;
            const index = linesArray.findIndex(
                (k) => k.lineId === this.selectedLine!.lineId
            );
            if (index !== -1) {
                const nextLine = linesArray[index + 1];
                this.artefactEditorState.toggleSelectSign(
                    nextLine.signs[1].signInterpretations[0],
                    false
                );
            }
        }
    }

    private onParamsChanged(evt: ArtefactEditorParamsChangedArgs) {
        this.params = evt.params; // This makes sure a change is triggered in child components
        if (evt.property === 'rotationAngle') {
            const op: ArtefactRotateOperation = new ArtefactRotateOperation(
                this.artefact.id,
                this.artefact.placement.rotate,
                evt.value
            );
            this.onNewOperation(op);
        }
    }

    private onAuto() {
        this.autoMode = !this.autoMode;
    }

    private fillImageSettings() {
        if (!this.imageStack) {
            throw new Error(
                `No image stack for artefact ${this.artefact.id} in artefact-editor`
            );
        }
        this.params.imageSettings = {};
        for (const imageType of this.imageStack.availableImageTypes) {
            const image = this.imageStack.getImage(imageType);
            if (image) {
                const isMaster = this.imageStack.master.type === imageType;
                const imageSetting = {
                    image,
                    type: imageType,
                    visible: isMaster,
                    opacity: 1,
                    normalizedOpacity: 1,
                };
                // Make sure this object is tracked by Vue
                this.$set(this.params.imageSettings, imageType, imageSetting);
            }
        }
        normalizeOpacity(this.params.imageSettings);
    }

    private calculateBoundingBox() {
        // We want to support rotation without moving or scroll the artefact. This requires a little
        // math. We start with the artefact's actual bounding box, which is a rectangle. We need to calculate the
        // bounding box that will contain all the possible rotations of the artefact's original bounding box.
        // This is pretty easy to do - take the diagonal of the original bounding box, and build a square with a
        // side of that size. The square's center should be the center of the original bounding box.
        //
        // We ask the server to cut the image at the square, and treat everything as square. That way when we
        // rotate everything is still visible.
        const bb = this.artefact.mask.getBoundingBox();
        const diag = Math.sqrt(bb.height * bb.height + bb.width * bb.width);
        const center = (this.boundingBoxCenter = {
            x: bb.x + bb.width / 2,
            y: bb.y + bb.height / 2,
        } as Position);

        this.boundingBox = {
            x: center.x - diag / 2,
            y: center.y - diag / 2,
            width: diag,
            height: diag,
        };
    }

    private initVisibleRois() {
        this.visibleRois = [];
        for (const roi of this.$state.interpretationRois.getItems()) {
            if (
                roi.status !== 'deleted' &&
                roi.artefactId === this.artefact.id
            ) {
                this.visibleRois.push(roi);
            }
        }
    }

    private onRoiClicked(roi: InterpretationRoi) {
        this.artefactEditorState.selectRoi(roi);
        this.artefactEditorState.selectedSignsInterpretation = [];

        if (!roi.signInterpretationId) {
            this.artefactEditorState.selectedSignsInterpretation = [];
        } else {
            const si = this.$state.signInterpretations.get(
                roi.signInterpretationId
            );
            this.artefactEditorState.toggleSelectSign(si, false);
        }
    }

    private onModeClick(newMode: ActionMode) {
        this.mode = newMode;
    }

    private async saveRotation() {
        const rotation = (this.rotationAngle % 360) + (360 % 360);
        if (rotation === this.artefact.placement.rotate) {
            return false;
        }

        this.artefact.placement.rotate =
            (this.rotationAngle % 360) + (360 % 360);
        await this.artefactService.changeArtefact(
            this.artefact.editionId,
            this.artefact
        );
        return true;
    }

    private async saveROIs() {
        const selected = this.artefactEditorState.singleSelectedSi;

        const updated = await this.textService.updateArtefactROIs(
            this.artefact
        );
        this.initVisibleRois();
        // if (selected) {
        //     // Make sure we select again, as the ROIs might have changed
        //     this.artefactEditorState.onSignInterpretationClicked(selected, false);
        // }

        return updated > 0;
    }

    private showMessage(msg: string, type: string = 'info') {
        this.$toasted.show(this.$tc(msg), {
            type,
            position: 'top-right',
            duration: 7000,
        });
    }

    private onNewOperation(op: ArtefactEditorOperation) {
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
.overlay {
    position: absolute;
    transform-origin: top left;
}
#artefact-editor {
    overflow: hidden;
    height: calc(100vh - 63px);
}

.artefact-menu-div {
    height: calc(100vh - 63px);
    overflow: hidden;
}
#zoom-div {
    position: absolute;
}
#rotate-dev {
    transform-origin: top left;
}
.buttons-div {
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

#sidebar.sidebar {
    margin-left: -250px;
    transform: rotateY(100deg); /* Rotate sidebar vertically by 100 degrees. */
}

.artefact-container.sidebar.text {
    overflow: auto;
    position: relative;
    padding: 0;
    height: calc(100vh - 63px);
    width: calc(100vw - 80px);
}

.artefact-container.text {
    overflow: auto;
    position: relative;
    padding: 0;
    height: calc(100vh - 63px);
    width: calc(100vw - 330px);
}

.artefact-container.sidebar {
    overflow: auto;
    position: relative;
    padding: 0;
    height: calc(100vh - 63px);
    width: calc((100vw - 80px) / 2);
}

.artefact-container {
    overflow: auto;
    position: relative;
    padding: 0;
    height: calc(100vh - 63px);
    width: calc((100vw - 330px) / 2);
}

#text-right-sidebar {
    height: calc(100vh - 63px);
    width: calc((100vw - 330px) / 2);
    // overflow: scroll;
}

#text-right-sidebar.sidebar.text {
    margin-right: calc((-100vw + 80px) / 2);
}

#text-right-sidebar.text {
    margin-right: calc((-100vw + 330px) / 2);
}

#text-right-sidebar.sidebar {
    width: calc((100vw - 80px) / 2);
}

#artefact-and-buttons {
    margin: 0px;
}

.sign-wheel-position {
    margin-top: 56px;
    text-align: center;
}
.btn-next-line {
    position: absolute;
    top: 0px;
}

// TODO -- update the madia
@media (max-width: 1100px) {
    /* Reversing the behavior of the sidebar:
       it'll be rotated vertically and off canvas by default,
       collapsing in on toggle button click with removal of
       the vertical rotation.   */

    #sidebar.sidebar {
        margin-left: -250px;
        transform: rotateY(100deg);
    }
    #sidebar.sidebarActive {
        margin-left: 0;
        transform: none;
    }
    .overlay {
        position: absolute;
        transform-origin: top left;
    }

    // TODO- check the scrolls in tablet, maybe they dno't have to appear.
    .artefact-container.sidebar.text {
        overflow: scroll;
        position: relative;
        padding: 0;
        height: calc(100vh - 63px);
        width: calc((93vw) / 2);
    }

    .artefact-container.text {
        overflow: scroll;
        position: relative;
        padding: 0;
        height: calc(100vh - 63px);
        width: calc(100vw - 80px);
    }

    .artefact-container.sidebar {
        overflow: scroll;
        position: relative;
        padding: 0;
        height: calc(100vh - 63px);
        width: calc((100vw - 80px));
    }

    .artefact-container {
        overflow: scroll;
        position: relative;
        padding: 0;
        height: calc(100vh - 63px);
        width: calc(100vw - 80px);
    }

    #text-right-sidebar.sidebar.text {
        margin-right: calc((-100vw + 330px) / 2);
    }

    #text-right-sidebar.sidebar.text {
        width: calc((90vw) / 2);
        transform: rotateY(0deg);
    }

    #text-right-sidebar.text {
        width: calc((100vw - 80px) / 2);
    }

    #text-right-sidebar.sidebar {
        margin-right: calc(-100vw + 330px);
    }

    #text-side {
        margin: 30px -5px 20px 30px;
    }

    .sidebar.text {
        .sign-wheel-position {
            margin-left: 0px;
            margin-right: 0px;
            width: calc((87vw) / 2);
        }
    }
    .sign-wheel {
        overflow: auto;
        white-space: normal;
        word-break: break-word;
        text-align: center;
    }
    .sign-wheel-position {
        text-align: center;
        margin-top: 50px;
        z-index: 1000;
    }
}
</style>
