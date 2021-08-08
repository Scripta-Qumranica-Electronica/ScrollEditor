<template>
    <div>
        <div v-if="waiting" class="col">
            <waiting></waiting>
        </div>
        <div v-if="!waiting">
            <div class="mt-4 editor-container">
                <b-row>
                    <b-col class="d-flex flex-column col-lg-9">
                        <toolbar no-gutters>
                            <artefact-editor-toolbar
                                :artefact="artefact"
                                @paramsChanged="onParamsChanged($event)"/>
                            <div id="other-toolboxes" class="d-flex">
                                <toolbox subject="Edit Modes">
                                    <toolbar-icon-button
                                        v-show="!readOnly"
                                        @click="onModeClick('polygon')"
                                        :pressed="actionMode === 'polygon'"
                                        :disabled="!isDrawingEnabled"
                                        :title="$t('misc.draw')"
                                        :show-text="true"
                                        icon="pen" />
                                    <toolbar-icon-button
                                        v-show="!readOnly"
                                        @click="onModeClick('box')"
                                        :pressed="actionMode === 'box'"
                                        :disabled="!isDrawingEnabled"
                                        :title="$t('misc.box')"
                                        :show-text="true"
                                        icon="square" />
                                    <toolbar-icon-button
                                        :title="$t('misc.select')"
                                        @click="onModeClick('select')"
                                        :pressed="actionMode === 'select'"
                                        :show-text="true"
                                        icon="mouse-pointer" />
                                </toolbox>
                                <toolbox subject="">
                                    <toolbar-icon-button
                                        :title="$t('misc.cancel')"
                                        v-if="!readOnly"
                                        @click="onDeleteRoi"
                                        :disabled="!isDeleteEnabled"
                                        icon="trash"
                                        :show-text="true" />
                                </toolbox>
                                <toolbox subject="">
                                    <b-form-checkbox
                                        @input="onHighlightComment($event)"
                                        switch
                                        size="sm"
                                        >Comments</b-form-checkbox
                                    >
                                    <b-form-checkbox
                                        switch
                                        size="sm"
                                        v-if="!readOnly"
                                        @input="onAuto()"
                                        id="auto-character"
                                        >Auto character
                                        select</b-form-checkbox
                                    >
                                </toolbox>
                            </div>
                        </toolbar>
                        <div
                            class="artefact-image-container"
                            style="flex-grow: 1"
                            ref="infoBox"
                        >
                            <div class="d-flex flex-column artefact-container">
                                <div style="height: 60px">
                                    <span v-if="artefactMode">{{
                                        artefact.name
                                    }}</span>
                                    <b-form-select
                                        v-if="textFragmentMode"
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
                                            selectedSignInterpretations.length ===
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
                                    style="flex-grow: 1; height: 10px"
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
                                                    actionMode !== 'select'
                                                "
                                                :mode="actionMode"
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
                            v-if="!waiting && artefact"
                            :class="{
                                sidebar: isActiveSidebar,
                                text: isActiveText,
                                'h-100 w-100': true,
                            }"
                        >
                            <text-side
                                :editor-mode="editorMode"
                                :artefact="artefact"
                                :text-fragment="textFragment"
                                @sign-interpretation-clicked="
                                    onSignInterpretationClicked($event)
                                "
                                @text-fragment-selected="initVisibleRois()"
                                @text-fragments-loaded="initVisibleRois()"
                            ></text-side>
                            <sign-attribute-pane class="" />
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
    ArtefactEditorMode,
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
import { SavingAgent, OperationsManager } from '@/utils/operations-manager';
import SignAttributePane from '@/components/sign-attributes/sign-attribute-pane.vue';
import ArtefactEditorToolbar from './artefact-editor-toolbar.vue';
import { ArtefactEditorState } from '@/state/artefact-editor';
import { Artefact } from '@/models/artefact';
import { TextFragmentState } from '@/state/text-fragment';
import Toolbar from '@/components/toolbars/toolbar.vue';
import Toolbox from '@/components/toolbars/toolbox.vue';
import ToolbarIconButton from '@/components/toolbars/toolbar-icon-button.vue';

@Component({
    name: 'artefact-editor',
    components: {
        waiting: Waiting,
        'artefact-editor-toolbar': ArtefactEditorToolbar,
        'text-side': TextSide,
        'image-layer': ImageLayer,
        'roi-layer': RoiLayer,
        'boundary-drawer': BoundaryDrawer,
        zoomer: Zoomer,
        toolbar: Toolbar,
        toolbox: Toolbox,
        'sign-wheel': SignWheel,
        'edition-icons': EditionIcons,
        'sign-attribute-pane': SignAttributePane,
        'toolbar-icon-button': ToolbarIconButton,
    },
})
export default class ArtefactEditor
    extends Vue
    implements SavingAgent<ArtefactEditorOperation> {
    // public params: ArtefactEditorParams = new ArtefactEditorParams();
    private actionMode: ActionMode = 'box';

    // Two modes of operation. In artefact mode, the artefact is  chosen, and text fragments can be added to it.
    // In text-fragment mode, the text fragment is constant, and artefacts can be changed.
    private editorMode: ArtefactEditorMode = 'artefact';
    private get artefactMode() {
        return this.editorMode === 'artefact';
    }
    private get textFragmentMode() {
        return this.editorMode === 'text-fragment';
    }

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

    // Arguments retrieved from the URL
    private editionId: number = 0;
    private artefactId: number = 0; // Only relevent in artefact mode
    private textFragmentId: number = 0; // Only relevent in text-fragment mode
    private textFragment: TextFragment | null = null; // The single Text Fragment in text-fragment mode

    protected get artefact() {
        return this.$state.artefacts.current!;
    }
    private get params(): ArtefactEditorParams {
        return this.$state.artefactEditor.params || new ArtefactEditorParams();
    }

    protected get visibleRois() {
        return this.artefact.rois;
    }

    public get artefactEditorState() {
        return this.$state.artefactEditor;
    }
    public get textFragmentEditorState() {
        return this.$state.textFragmentEditor;
    }

    public get selectedSignInterpretations(): SignInterpretation[] {
        return this.textFragmentEditorState.selectedSignInterpretations;
    }

    public get selectedInterpretationRoi(): InterpretationRoi | null {
        return this.artefactEditorState.selectedInterpretationRoi;
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
        if (!this.selectedSignInterpretations.length) {
            console.error("Can't add ROI with no selected sign");
            return;
        }

        const bbox = poly.getBoundingBox();
        const normalized = Polygon.offset(poly, -bbox.x, -bbox.y);
        const roi = InterpretationRoi.new(
            this.artefact,
            this.textFragmentEditorState.singleSelectedSi!,
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
        this.textFragmentEditorState.selectedSignInterpretations = [];
    }

    protected async created() {
        await this.$state.prepare.edition(
            parseInt(this.$route.params.editionId)
        );
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
        this.$state.eventBus.off('change-artefact-rotation');
        this.$state.eventBus.off('remove-roi', this.removeRoi);
        this.$state.eventBus.off('new-operation', this.onNewOperation);
        this.$state.eventBus.off(
            'new-bulk-operations',
            this.onNewBulkOperations
        );

        this.$state.operationsManager = null;
    }

    protected async mounted() {
        this.waiting = true;
        if (this.$bp.between('sm', 'lg')) {
            this.isActiveSidebar = true;
        }

        //  verifier url
        this.editionId = parseInt(this.$route.params.editionId);
        if (this.$route.params.artefactId) {
            this.artefactId = parseInt(this.$route.params.artefactId);
            this.editorMode = 'artefact';
        }
        if (this.$route.params.textFragmentId) {
            this.textFragmentId = parseInt(this.$route.params.textFragmentId);
            this.editorMode = 'text-fragment';

            // Note that artefactId and textFragmentId can't be both specified, because there is no Route that has both.
            // In case the routes change and suddenly allow this, text-fragment takes precedence.
        }

        if (this.artefactMode) {
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
        } else if (this.textFragmentMode) {
            await this.$state.prepare.textFragment(
                this.editionId,
                this.textFragmentId
            );
            this.textFragment =
                this.$state.textFragments.get(this.textFragmentId) || null;

            await this.selectArtefact(this.artefacts[0].id);
        }

        this.waiting = false;
        this.$nextTick(() => {
            this.$nextTick(() => {
                this.setFirstZoom();
            });
        });
        this.$state.operationsManager = this.operationsManager;
        this.$state.textFragmentEditor.textEditingMode = 'artefact';
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
        if (this.artefact?.isVirtual) {
            return this.boundingBox.width * 1.5;
        }
        return this.masterImage.width;
    }

    private get imageHeight(): number {
        if (this.artefact?.isVirtual) {
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
            !!this.textFragmentEditorState.singleSelectedSi &&
            !this.textFragmentEditorState.singleSelectedSi.isReconstructed
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

        if (!this.artefact?.isVirtual) {
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
                this.textFragmentEditorState.removeTextFragementFromArtefact(
                    si
                );
                // if new ROI and new text fragment, add text fragment to artefact
            } else if (!tfToMove && anyRoiOfSelectedTf) {
                this.textFragmentEditorState.addTextFragementToArtefact(si);
            }
        }
    }
    private setFirstZoom() {
        const infoBox = this.$refs.infoBox as HTMLDivElement;
        const height = infoBox.clientHeight;
        const width = infoBox.clientWidth;
        this.params.zoom = Math.min(
            height / this.boundingBox.height,
            width / this.boundingBox.width
        );
    }

    private onDeleteRoi() {
        const roi = this.selectedInterpretationRoi;
        const si = this.selectedSignInterpretations;
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
        if (!this.textFragmentEditorState.singleSelectedSi) {
            return null;
        }

        return this.textFragmentEditorState.singleSelectedSi!.sign.line;
    }

    private nextSign() {
        if (this.textFragmentEditorState.singleSelectedSi) {
            let newIndex =
                this.textFragmentEditorState.singleSelectedSi!.sign
                    .indexInLine + 1;
            while (newIndex < this.selectedLine!.signs.length) {
                const newSI =
                    this.selectedLine!.signs[newIndex].signInterpretations[0];
                if (newSI.character && !newSI.isReconstructed) {
                    this.textFragmentEditorState.selectSign(newSI);
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
            this.textFragmentEditorState.selectedSignInterpretations.length >
                1 &&
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
        if (this.artefact?.isVirtual) {
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

    private onRoiClicked(roi: InterpretationRoi) {
        this.artefactEditorState.selectRoi(roi);
        this.textFragmentEditorState.selectedSignInterpretations = [];

        if (!roi.signInterpretationId) {
            this.textFragmentEditorState.selectedSignInterpretations = [];
        } else {
            const si =
                this.$state.signInterpretations.get(roi.signInterpretationId) ||
                null;
            this.textFragmentEditorState.selectSign(si);
        }
    }

    private onModeClick(newMode: ActionMode) {
        this.actionMode = newMode;
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
        const selected = this.textFragmentEditorState.singleSelectedSi;

        const updated = await this.textService.updateArtefactROIs(
            this.artefact,
            mode
        );
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
}
</script>

<style lang="scss" scoped>
@import '@/assets/styles/_variables.scss';
@import '@/assets/styles/_fonts.scss';

.header-actions {
    background-color: $white;
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
    margin-right: 1.5rem;
    margin-left: 1.5rem;
    height: calc(100vh - 95px);
    /* height: calc(100vh - 2rem); */
}

.editor-actions {
    /* height: 70px; */
    height: 10rem;
}

.artefact-container {
    text-align: center;
    height: 100%;
}

// .artefact-image-container{
//     height: 60%;
// }

@media (max-width: 1100px) {
    .editor-actions {
        /* height: 70px; */
        height: 10rem;
    }

    .artefact-image-container {
        margin-top: 0.1rem;
        height: calc(100vh - 310px);
    }

    // .artefact-image-container{
    //     height: 60%;
    // }

    @media (max-width: 1100px) {
        .editor-container {
            /* margin-top: 0.7rem;
        margin-bottom: 0.7rem; */
            padding-top: 3rem;
            margin-right: 0.7rem;
            padding-right: 0.3rem;
            margin-left: 0.7rem;
            padding-left: 2rem;
            height: calc(100vh - 90px);
            overflow: auto;
        }
    }

    .artefact-image-container {
        margin-top: 0.1rem;
        height: 60%;
    }
}
</style>