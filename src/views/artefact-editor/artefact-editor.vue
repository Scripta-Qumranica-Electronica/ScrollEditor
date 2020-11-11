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
                            <b-button
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
                                v-show="!readOnly"
                                :key="mode.val"
                                @click="onModeClick(mode.val)"
                                :pressed="mode === mode.val"
                                :disabled="!isDrawingEnabled"
                                class="m-2"
                                v-b-tooltip.hover.bottom
                                :title="mode.title"
                            >
                                <i :class="mode.icon"></i>
                            </b-button>
                            <b-button
                                v-if="!readOnly"
                                type="button"
                                class="m-2"
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
                                @click="onModeClick('select')"
                                :pressed="mode === 'select'"
                                class="m-2"
                                v-b-tooltip.hover.bottom
                                :title="$t('misc.select')"
                            >
                                <i class="fa fa-mouse-pointer"></i>
                            </b-button>
                            <b-button
                                class="m-2"
                                :disabled="!canUndo"
                                @click="onUndo()"
                                >Undo</b-button
                            >
                            <b-button
                                class="m-2"
                                :disabled="!canRedo"
                                @click="onRedo()"
                                >Redo</b-button
                            >
                        </div>
                    </b-col>
                    <b-col class="pl-3 pt-3"
                        ><div>{{ saveStatusMessage }}</div></b-col
                    >
                </b-row>
            </div>
            <div class="mt-4 editor-container">
                <b-row class="h-100">
                    <b-col cols="8" class="h-100">
                        <div class="editor-actions">
                            <b-row class="border-bottom">
                                <b-col>
                                    <artefact-editor-toolbar
                                        :artefact="artefact"
                                        :params="params"
                                        @paramsChanged="onParamsChanged($event)"
                                    ></artefact-editor-toolbar>
                                </b-col>
                                <b-col class="col-2 pt-4">
                                    <div>
                                        <b-form-checkbox
                                            @input="onHighlightComment($event)"
                                            switch
                                            size="sm"
                                            >Comments</b-form-checkbox
                                        >
                                    </div>
                                </b-col>
                                <b-col class="col-3 pt-4">
                                    <div>
                                        <b-form-checkbox
                                            switch
                                            size="sm"
                                            v-if="!readOnly"
                                            @input="onAuto()"
                                            >Auto character
                                            select</b-form-checkbox
                                        >
                                    </div>
                                </b-col>
                            </b-row>
                        </div>
                        <div class="artefact-image-container">
                            <div class="artefact-container" ref="infoBox">
                                <div>
                                    {{ artefact.name }}
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
                                <b-button
                                    type="button"
                                    v-show="$bp.between('sm', 'lg')"
                                    @click="nextLine()"
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
                    <b-col class="border-left px-0 h-100">
                        <div
                            class="h-100"
                            v-if="!waiting && artefact"
                            :class="{
                                sidebar: isActiveSidebar,
                                text: isActiveText,
                            }"
                        >
                            <text-side
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
import ArtefactImage from '@/views/artefact-editor/artefact-image.vue';
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
import { ArtefactTextFragmentData } from '@/models/text';

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
    SignInterpretationCommentOperation,
    TextFragmentAttributeOperation,
} from './operations';
import {
    SavingAgent,
    OperationsManager,
    OperationsManagerStatus,
} from '@/utils/operations-manager';
import SignAttributePane from '@/components/sign-attributes/sign-attribute-pane.vue';
import ArtefactEditorToolbar from './artefact-editor-toolbar.vue';
import EditionHeader from '../edition/components/edition-header.vue';

@Component({
    name: 'artefact-editor',
    components: {
        'waiting': Waiting,
        'artefact-image': ArtefactImage,
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
    public params: ArtefactEditorParams = new ArtefactEditorParams();
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
    protected get artefact() {
        return this.$state.artefacts.current!;
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
            const appliedRotation = await this.saveRotation();
            const appliedROIs = await this.saveROIs();
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

        const op: ArtefactROIOperation = new ArtefactROIOperation(
            'draw',
            roi,
        );
        op.redo();
        this.$state.artefactEditor.selectRoi(roi);
        this.statusTextFragment(roi);

        this.onNewOperation(op);
        if (this.autoMode) {
            // Find the next sign interpretation with a character - that can be mapped.
            this.playSound('/qumran_hum.mp3');
            setTimeout(this.nextSign, 1500);
        }
    }

    public get artefactEditorState() {
        return this.$state.artefactEditor;
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
        this.onNewOperation(op);
        op.redo();
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
                this.artefactEditorState.selectSign(newSI);
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
                const newSI = nextLine.signs[1].signInterpretations[0];
                this.artefactEditorState.selectSign(newSI);
            }
        }
    }

    private onParamsChanged(evt: ArtefactEditorParamsChangedArgs) {
        this.params = evt.params; // This makes sure a change is triggered in child components
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