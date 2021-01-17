<template>
    <div>
        <div v-if="waiting" class="col">
            <waiting></waiting>
        </div>
        <div v-if="!waiting">
            <div class="mb-3 header-actions">
                <b-row class="mx-4 py-2">
                    <b-col cols="8">
                        <edition-header></edition-header>
                    </b-col>
                    <b-col cols="0">
                        <div class="btn-tf">
                            <span
                                tabindex="0"
                                class="d-inline-block"
                                :style="{
                                    pointerEvents: isDrawingEnabled
                                        ? 'all'
                                        : 'none',
                                }"
                                v-for="mode in [
                                    {
                                        icon: 'fa fa-pencil-square-o',
                                        val: 'polygon',
                                        title: this.$t('misc.draw'),
                                    },
                                    {
                                        icon: 'fa fa-square-o',
                                        val: 'box',
                                        title: this.$t('misc.box'),
                                    },
                                ]"
                                :key="mode.val"
                                v-b-tooltip.hover.bottom
                                :title="mode.title"
                            >
                                <b-button
                                    v-show="!readOnly"
                                    @click="onModeClick(mode.val)"
                                    :pressed="mode === mode.val"
                                    :disabled="!isDrawingEnabled"
                                    class="m-2"
                                >
                                    <i :class="mode.icon"></i>
                                </b-button>
                            </span>
                            <span
                                tabindex="0"
                                class="d-inline-block"
                                v-b-tooltip.hover.bottom
                                :style="{
                                    pointerEvents: isDrawingEnabled
                                        ? 'all'
                                        : 'none',
                                }"
                                :title="$t('misc.cancel')"
                            >
                                <b-button
                                    v-if="!readOnly"
                                    type="button"
                                    class="m-2"
                                    @click="onDeleteRoi()"
                                    :disabled="!isDeleteEnabled"
                                >
                                    <i class="fa fa-trash"></i> </b-button
                            ></span>
                            <span
                                tabindex="0"
                                class="d-inline-block"
                                v-b-tooltip.hover.bottom
                                :style="{
                                    pointerEvents: isDrawingEnabled
                                        ? 'all'
                                        : 'none',
                                }"
                                :title="$t('misc.select')"
                            >
                                <b-button
                                    v-if="!readOnly"
                                    type="button"
                                    @click="onModeClick('select')"
                                    :pressed="mode === 'select'"
                                    class="m-2"
                                >
                                    <i
                                        class="fa fa-mouse-pointer"
                                    ></i> </b-button
                            ></span>
                            <b-button
                                class="m-2 undo"
                                :disabled="!canUndo"
                                @click="onUndo()"
                                >Undo</b-button
                            >
                            <b-button
                                class="m-2 redo"
                                :disabled="!canRedo"
                                @click="onRedo()"
                                >Redo</b-button
                            >
                        </div>
                    </b-col>
                    <div class="pt-3">{{ saveStatusMessage }}</div>
                </b-row>
            </div>
            <div class="mt-4 editor-container">
                <b-row class="h-100">
                    <b-col class="h-100 col-lg-9">
                        <div class="editor-actions">
                            <b-row class="border-bottom">
                                <b-col class="col-lg-8">
                                    <artefact-editor-toolbar
                                        :artefact="artefact"
                                        @paramsChanged="onParamsChanged($event)"
                                    ></artefact-editor-toolbar>
                                </b-col>
                                <div class="pt-4 col-lg-4 row no-gutters">
                                    <div class="col-xl-6 col-md-12">
                                        <b-form-checkbox
                                            @input="onHighlightComment($event)"
                                            switch
                                            size="sm"
                                            >Comments</b-form-checkbox
                                        >
                                    </div>
                                    <div class="col-xl-6 col-md-12">
                                        <b-form-checkbox
                                            switch
                                            size="sm"
                                            v-if="!readOnly"
                                            @input="onAuto()"
                                            id="auto-character"
                                            >Auto character
                                            select</b-form-checkbox
                                        >
                                    </div>
                                </div>
                            </b-row>
                        </div>
                        <div class="artefact-image-container">
                            <div class="artefact-container" ref="infoBox">
                                <div style="height: 60px">
                                    <span v-if="!isNaN(this.artefactId)">{{
                                        artefact.name
                                    }}</span>
                                    <b-form-select
                                        v-if="isNaN(this.artefactId)"
                                        @input="selectArtefact($event)"
                                        :options="artefacts"
                                        value-field="id"
                                        text-field="name"
                                        size="sm"
                                        class="mt-4 col-3"
                                        
                                    ></b-form-select>
                                    <edition-icons
                                        :edition="edition"
                                        :show-text="true"
                                    />
                                    <sign-wheel
                                        v-if="
                                            selectedSignsInterpretation.length ==
                                            1
                                        "
                                        :line="selectedLine"
                                    />
                                </div>
                                <!-- <b-button
                                    type="button"
                                    v-show="$bp.between('sm', 'lg')"
                                    @click="nextLine()"
                                >
                                    <i class="fa fa-arrow-left"></i>
                                </b-button> -->
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
                                        <g
                                            :transform="transform"
                                            id="transform-root"
                                        >
                                            <!-- Rotate and scale the content -->
                                            <!-- This group's coordinate system is the master image's -->
                                            <image-layer
                                                :width="imageWidth"
                                                :height="imageHeight"
                                                :params="params"
                                                :clipping-mask="artefact.mask"
                                                :boundingBox="
                                                    artefact.mask.getBoundingBox()
                                                "
                                                :artefact="artefact"
                                            />
                                            <roi-layer
                                                :rois="visibleRois"
                                                @roi-clicked="
                                                    onRoiClicked($event)
                                                "
                                            />
                                            <boundary-drawer
                                                v-show="
                                                    isDrawingEnabled &&
                                                    mode !== 'select'
                                                "
                                                :mode="mode"
                                                transformRootId="transform-root"
                                                @new-polygon="
                                                    onNewPolygon($event)
                                                "
                                            />
                                        </g>
                                    </svg>
                                </zoomer>
                            </div>
                        </div>
                    </b-col>
                    <b-col class="border-left px-0 h-100 col-lg-3">
                        <div
                            class="h-100"
                            v-if="!waiting && artefact"
                            :class="{
                                sidebar: isActiveSidebar,
                                text: isActiveText,
                            }"
                        >
                            <text-side
                                :float="!isNaN(this.artefactId)"
                                :artefact="artefact"
                                @sign-interpretation-clicked="
                                    onSignInterpretationClicked($event)
                                "
                                @text-fragment-selected="initVisibleRois()"
                                @text-fragments-loaded="initVisibleRois()"
                            ></text-side>
                            <sign-attribute-pane />
                        </div>
                    </b-col>
                </b-row>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import Waiting from '@/components/misc/Waiting.vue';
import ArtefactService from '@/services/artefact';
import SignInterpretationService from '@/services/sign-interpretation';
import ArtefactSideMenu from '@/views/artefact-editor/artefact-side-menu.vue';
import TextSide from '@/views/artefact-editor/text-side.vue';
import {
    ArtefactEditorParams,
    ArtefactEditorParamsChangedArgs,
} from '@/views/artefact-editor/types';
import { IIIFImage, ImageStack } from '@/models/image';
import { Position } from '@/models/misc';
import { ArtefactTextFragmentData, TextFragment } from '@/models/text';

import { normalizeOpacity } from '@/components/image-settings/types';
import { SignInterpretation, InterpretationRoi, Line } from '@/models/text';
import { Polygon } from '@/utils/Polygons';
import { ImagedObject } from '@/models/imaged-object';
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
    ArtefactROIOperation,
    ArtefactRotateOperation,
    SignInterpretationEditOperation,
    SignInterpretationCommentOperation,
    TextFragmentAttributeOperation,
    CreateSignInterpretationOperation,
    DeleteSignInterpretationOperation,
    UpdateSignInterperationOperation,
} from './operations';
import {
    SavingAgent,
    OperationsManager,
    OperationsManagerStatus,
} from '@/utils/operations-manager';
import SignAttributePane from '@/components/sign-attributes/sign-attribute-pane.vue';
import ArtefactEditorToolbar from './artefact-editor-toolbar.vue';
import EditionHeader from '../edition/components/edition-header.vue';
import { ArtefactEditorState } from '@/state/artefact-editor';
import { Artefact } from '@/models/artefact';

@Component({
    name: 'artefact-editor',
    components: {
        'waiting': Waiting,
        'artefact-editor-toolbar': ArtefactEditorToolbar,
        'text-side': TextSide,
        'image-layer': ImageLayer,
        'roi-layer': RoiLayer,
        'boundary-drawer': BoundaryDrawer,
        'zoomer': Zoomer,
        'sign-wheel': SignWheel,
        'edition-icons': EditionIcons,
        'sign-attribute-pane': SignAttributePane,
        'edition-header': EditionHeader,
    },
})
export default class ArtefactEditor
    extends Vue
    implements SavingAgent<ArtefactEditorOperation> {
    // public params: ArtefactEditorParams = new ArtefactEditorParams();
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
    private signInterpretationService = new SignInterpretationService();
    private operationsManager = new OperationsManager<ArtefactEditorOperation>(
        this
    );

    private visibleRois: InterpretationRoi[] = [];
    private editionId: number = 0;
    private artefactId: number = 0;
    private textFragmentId: number = 0;
    private textFragment?: TextFragment;

    protected get artefact() {
        return this.$state.artefacts.current!;
    }
    private get params(): ArtefactEditorParams {
        return this.artefactEditorState.params || new ArtefactEditorParams();
    }
    public get artefactEditorState(): ArtefactEditorState {
        return this.$state.artefactEditor;
    }

    public get selectedSignsInterpretation(): SignInterpretation[] {
        return this.artefactEditorState.selectedSignsInterpretation;
    }

    public get selectedInterpretationRoi(): InterpretationRoi | null {
        return this.artefactEditorState.selectedInterpretationRoi;
    }

    public get canUndo(): boolean {
        return this.operationsManager.canUndo;
    }
    public get canRedo(): boolean {
        return this.operationsManager.canRedo;
    }

    public async saveEntities(
        ops: ArtefactEditorOperation[]
    ): Promise<boolean> {
        const as = new ArtefactService();

        this.saving = true;
        try {
            await this.saveRotation();
            await this.saveROIs('deleted');
            await this.saveSignInterpretations(
                ops.filter(
                    (op) => op.type === 'sign'
                ) as SignInterpretationEditOperation[]
            );
            await this.saveROIs('created');

            await this.saveAttributes(
                ops.filter(
                    (op) => op.type === 'attr'
                ) as TextFragmentAttributeOperation[]
            );
            await this.saveCommentaries(
                ops.filter(
                    (op) => op.type === 'commentary'
                ) as SignInterpretationCommentOperation[]
            );
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

        const op: ArtefactROIOperation = new ArtefactROIOperation('draw', roi);
        op.redo(true);
        this.$state.artefactEditor.selectRoi(roi);
        this.statusTextFragment(roi);

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
        this.statusTextFragment(newRoi);

        return newRoi;
    }

    public removeRoi(roi: InterpretationRoi) {
        this.statusTextFragment(roi);

        this.artefactEditorState.selectRoi(null);
        this.artefactEditorState.selectedSignsInterpretation = [];
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

    protected async created() {
        await this.$state.prepare.edition(
            parseInt(this.$route.params.editionId)
        );
        this.$state.eventBus.on('roi-changed', this.initVisibleRois);
        this.$state.eventBus.on(
            'change-artefact-rotation',
            (angle: number) => (this.params.rotationAngle = angle)
        );
        this.$state.eventBus.on('remove-roi', this.removeRoi);
        this.$state.eventBus.on('new-operation', this.onNewOperation);
        this.$state.eventBus.on(
            'new-bulk-operations',
            this.onNewBulkOperations
        );
    }

    protected destroyed() {
        this.$state.eventBus.off('roi-changed', this.initVisibleRois);
        this.$state.eventBus.off('change-artefact-rotation');
        this.$state.eventBus.off('remove-roi', this.removeRoi);
        this.$state.eventBus.off('new-operation', this.onNewOperation);
        this.$state.eventBus.off(
            'new-bulk-operations',
            this.onNewBulkOperations
        );
    }

    protected async mounted() {
        this.waiting = true;
        if (this.$bp.between('sm', 'lg')) {
            this.isActiveSidebar = true;
        }

        //  verifier url
        this.editionId = parseInt(this.$route.params.editionId);
        this.artefactId = parseInt(this.$route.params.artefactId);
        this.textFragmentId = parseInt(this.$route.params.textFragmentId);

        if (!isNaN(this.artefactId)) {
            await this.prepareArtefact(this.artefactId);
            await Promise.all(
                this.artefact.textFragments.map(
                    (tf: ArtefactTextFragmentData) =>
                        this.$state.prepare.textFragment(
                            this.artefact.editionId,
                            tf.id
                        )
                )
            );
        } else if (!isNaN(this.textFragmentId)) {
            await this.prepareTextFragment(this.textFragmentId);
            // await Promise.all(
            // this.textFragment.artefacts.map((art: Artefact) =>
            //     this.$state.prepare.artefact(this.artefact.editionId, art.id)
            // )

            await this.selectArtefact(this.artefacts[0].id);
        }

        this.waiting = false;
    }

    private get edition(): EditionInfo {
        return this.$state.editions.current!;
    }

    public get artefacts(): Artefact[] {
        return this.$state.artefacts.items || [];
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
        if (this.artefact.isVirtual) {
            return this.boundingBox.width * 1.5;
        }
        return this.masterImage.width;
    }

    private get imageHeight(): number {
        if (this.artefact.isVirtual) {
            return this.boundingBox.height * 1.5;
        }
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
        return (
            !!this.artefactEditorState.singleSelectedSi &&
            !this.artefactEditorState.singleSelectedSi.isReconstructed
        );
    }

    private get isDeleteEnabled() {
        return !!this.selectedInterpretationRoi;
    }

    private get rotationAngle(): number {
        return this.params.rotationAngle;
    }

    private async selectArtefact(artefactId: number) {
        await this.prepareArtefact(artefactId);
    }

    private async prepareArtefact(artefactId: number) {
        await this.$state.prepare.artefact(this.editionId, artefactId);

        if (!this.artefact.isVirtual) {
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

            // Prepare the image manifests of all images
            const promises = this.imageStack.images.map((img) =>
                this.$state.prepare.imageManifest(img)
            );
            await Promise.all(promises);
        }

        this.params.rotationAngle = this.artefact.placement.rotate || 0;
        this.fillImageSettings();
        this.calculateBoundingBox();

        this.initVisibleRois();

        setTimeout(() => this.setFirstZoom(), 0);
    }

    private async prepareTextFragment(tfId: number) {
        await this.$state.prepare.textFragment(this.editionId, tfId);

        this.textFragment = this.$state.textFragments.get(tfId);
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
            const tfToMove = this.artefact.textFragments.find(
                (tf) => tf.id === tfId
            );
            // if any ROI found in current text fragment, put tf.certain = false
            if (!anyRoiOfSelectedTf && tfToMove) {
                this.artefactEditorState.removeTextFragementToArtefact(si);
                // if new ROI and new text fragment, add text fragment to artefact
            } else if (!tfToMove && anyRoiOfSelectedTf) {
                this.artefactEditorState.addTextFragementToArtefact(si);
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
            'erase',
            roi.clone()
        );
        op.redo(true);
        this.onNewOperation(op);
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
        if (this.artefactEditorState.singleSelectedSi) {
            let newIndex =
                this.artefactEditorState.singleSelectedSi!.sign.indexInLine + 1;
            while (newIndex < this.selectedLine!.signs.length) {
                const newSI = this.selectedLine!.signs[newIndex]
                    .signInterpretations[0];
                if (newSI.character && !newSI.isReconstructed) {
                    this.artefactEditorState.selectSign(newSI);
                    break;
                }
                newIndex++;
            }
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

    // private nextLine() {
    //     if (this.selectedLine) {
    //         const linesArray = this.selectedLine.textFragment.lines;
    //         const index = linesArray.findIndex(
    //             (k) => k.lineId === this.selectedLine!.lineId
    //         );
    //         if (index !== -1) {
    //             const nextLine = linesArray[index + 1];
    //             const newSI = nextLine.signs[1].signInterpretations[0];
    //             this.artefactEditorState.selectSign(newSI);
    //         }
    //     }
    // }

    private onParamsChanged(evt: ArtefactEditorParamsChangedArgs) {
        if (evt.property === 'rotationAngle') {
            const op: ArtefactRotateOperation = new ArtefactRotateOperation(
                this.artefact.placement.rotate,
                evt.value
            );
            this.onNewOperation(op);
        }
    }

    private onAuto() {
        if (
            this.artefactEditorState.selectedSignsInterpretation.length > 1 &&
            this.autoMode
        ) {
            this.$toasted.show(this.$tc('toasts.artefactsAutoModeError'), {
                type: 'info',
                position: 'top-right',
                duration: 7000,
            });
            this.autoMode = false;
        } else {
            this.autoMode = !this.autoMode;
        }
    }

    private onHighlightComment(checked: boolean) {
        this.$state.artefactEditor.highlightCommentMode = checked;
    }

    private fillImageSettings() {
        this.params.imageSettings = {};
        if (this.artefact.isVirtual) {
            return;
        }

        if (!this.imageStack) {
            throw new Error(
                `No image stack for artefact ${this.artefact.id} in artefact-editor`
            );
        }
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
            this.artefactEditorState.selectSign(si);
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

    private async saveROIs(mode: 'created' | 'deleted') {
        const selected = this.artefactEditorState.singleSelectedSi;

        const updated = await this.textService.updateArtefactROIs(
            this.artefact,
            mode
        );
        this.initVisibleRois();
        // if (selected) {
        //     // Make sure we select again, as the ROIs might have changed
        //     this.artefactEditorState.onSignInterpretationClicked(selected, false);
        // }

        return updated > 0;
    }

    private async saveSignInterpretations(
        ops: SignInterpretationEditOperation[]
    ) {
        for (const op of ops) {
            switch (op.signOpType) {
                case 'create':
                    const createOp = op as CreateSignInterpretationOperation;
                    if (op.undone) {
                        await this.signInterpretationService.deleteSignInterpretation(
                            this.$state.editions.current!,
                            createOp.signInterpretation,
                            true
                        );
                    } else {
                        await this.signInterpretationService.createSignInterpretation(
                            this.$state.editions.current!,
                            createOp.signInterpretation
                        );
                    }
                    break;

                case 'delete':
                    const deleteOp = op as DeleteSignInterpretationOperation;
                    if (op.undone) {
                        const si = deleteOp.signInterpretation;
                        await this.signInterpretationService.createSignInterpretation(
                            this.$state.editions.current!,
                            si
                        );
                        deleteOp.signInterpretationId = si.signInterpretationId; // The id has changed to a negative number after the deletion
                    } else {
                        await this.signInterpretationService.deleteSignInterpretation(
                            this.$state.editions.current!,
                            deleteOp.signInterpretation
                        );
                    }
                    break;

                case 'update':
                    const updateOp = op as UpdateSignInterperationOperation;
                    await this.signInterpretationService.updateSignInterpretation(
                        this.$state.editions.current!,
                        op.signInterpretation
                    );
                    break;
            }
        }
    }

    private async saveAttributes(ops: TextFragmentAttributeOperation[]) {
        for (const op of ops) {
            const opType = op.attributeOperationType;
            const si = this.$state.signInterpretations.get(
                op.signInterpretationId
            );
            if (!si) {
                console.warn(
                    "Can't save attributes of non existing sign interpretation"
                );
                continue;
            }
            const existingIndex = si.findAttributeIndex(op.attributeValueId);

            // Determine the actual operation that needs to be performed on the server.
            // If the original operation is an update, this is also an update.
            // However, if the original operation is create/delete, which can be undone or redone, we delete
            // the attribute if it is not in the state, or recreate it if it is in the state
            let actualOpType = 'update';

            switch (opType) {
                case 'create':
                    actualOpType = existingIndex === -1 ? 'delete' : 'create';
                    break;
                case 'delete':
                    actualOpType = existingIndex === -1 ? 'delete' : 'create';
                    break;
                case 'update':
                    actualOpType = 'update';
                    break;
            }

            switch (actualOpType) {
                case 'create':
                    await this.signInterpretationService.createAttribute(
                        this.edition!,
                        si,
                        si.attributes[existingIndex]
                    );
                    break;
                case 'update':
                    if (!op.prev || !op.next) {
                        console.error(
                            'Found an update operation without both next and prev',
                            op
                        );
                        throw new Error(
                            'Found an update operation without both next and prev'
                        );
                    }

                    if (op.prev.attributeValueId === op.next.attributeValueId) {
                        // This is an update operation of a comment, we can use the update API
                        await this.signInterpretationService.updateAttribute(
                            this.edition!,
                            si,
                            op.next.attributeValueId,
                            si.attributes[existingIndex]
                        );
                        return;
                    }

                    const prevIndex = si.findAttributeIndex(
                        op.prev.attributeValueId
                    );
                    const nextIndex = si.findAttributeIndex(
                        op.next.attributeValueId
                    );

                    if (prevIndex !== -1 && nextIndex !== -1) {
                        console.error(
                            'In an attribute value update, we have both prev and next in the current attributes',
                            op
                        );
                        throw new Error(
                            'In an attribute value update, we have both prev and next in the current attributes'
                        );
                    }

                    // See if we delete prev and create next or vice versa
                    const prevIsCurrent = prevIndex !== -1;
                    const toDeleteAttributeValueId = prevIsCurrent
                        ? op.next.attributeValueId
                        : op.prev.attributeValueId;
                    const toCreateAttribute = prevIsCurrent ? op.prev : op.next;

                    await this.signInterpretationService.deleteAttribute(
                        this.edition!,
                        si,
                        toDeleteAttributeValueId
                    );
                    await this.signInterpretationService.createAttribute(
                        this.edition!,
                        si,
                        toCreateAttribute
                    );
                    break;
                case 'delete':
                    await this.signInterpretationService.deleteAttribute(
                        this.edition!,
                        si,
                        op.attributeValueId
                    );
                    break;
            }
        }
    }

    private async saveCommentaries(ops: SignInterpretationCommentOperation[]) {
        for (const op of ops) {
            const si = this.$state.signInterpretations.get(
                op.signInterpretationId
            );
            if (!si) {
                console.warn(
                    "Can't save commentary for non existing sign interpretation id ",
                    op.signInterpretationId
                );
                continue;
            }
            await this.signInterpretationService.updateCommentary(
                this.$state.editions.current!,
                si
            );
        }
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

    private onNewBulkOperations(ops: ArtefactEditorOperation[]) {
        this.operationsManager.addBulkOperations(ops);
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
@import '@/assets/styles/_variables.scss';
@import '@/assets/styles/_fonts.scss';

.header-actions {
    background-color: $white;
}
.artefact-container {
    text-align: center;
    height: 100%;
}

.status-badge {
    font-family: $font-family;
    text-align: center;
    font-size: $font-size-1;
    width: 68px;
    height: 29.58px;
    line-height: 20px;
}

.status-badge-draft {
    background-color: $light-orange;
    color: $orange;
}
.status-badge-published {
    background-color: $light-greend;
    color: $green;
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
.artefact-image-container {
    height: calc(100vh - 310px);
}
</style>