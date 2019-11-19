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
                @params-changed="onParamsChanged($event)"
                @save="onSave()"
            ></artefact-side-menu>
        </div>

        <div v-if="!waiting && artefact">
            <div class="row" id="artefact-and-buttons">
                <div class="buttons-div">
                    <b-button type="button" class="sidebarCollapse" @click="sidebarClicked()">
                        <i class="fa fa-align-justify"></i>
                    </b-button>
                </div>
                <div class="sign-wheel">
                    <sign-wheel v-if="selectedSignInterpretation"
                                :line="selectedLine"
                                :selectedSignInterpretation="selectedSignInterpretation"
                                @sign-interpretation-clicked="onSignInterpretationClicked"
                    />
                </div>
                <div
                    class="artefact-container"
                    :class="{ sidebar: isActiveSidebar, text: isActiveText }"
                >
                    <zoomer :zoom="zoomLevel" @new-zoom="onNewZoom($event)">
                        <svg class="overlay"
                            :width="actualWidth"
                            :height="actualHeight"
                            :viewBox="actualBoundingBox">
                            <!-- The SVG is in the coordinates of the master image, scaled down by the zoom factor. We only show
                                the bounding box of the artefact and not all of the surroundings, hence the viewBox attribute -->
                            <g :transform="transform" id="transform-root">  <!-- Rotate and scale the content -->
                                <!-- This group's coordinate system is the master image's -->
                                <image-layer :width="imageWidth"
                                            :height="imageHeight"
                                            :params="params"
                                            :clipping-mask="artefact.mask.polygon"
                                            :boundingBox="artefact.mask.polygon.getBoundingBox()"/>
                                <roi-layer :rois="visibleRois" 
                                        :selected="selectedInterpretationRoi"
                                        @roi-clicked="onRoiClicked($event)"/>
                                <boundary-drawer v-show="isDrawingEnabled"
                                                :mode="drawingMode"
                                                transformRootId="transform-root"
                                                @new-polygon="onNewPolygon($event)"/>
                            </g>
                        </svg>
                    </zoomer>
                </div>
                <div class="buttons-div">
                    <b-button type="button" class="sidebarCollapse" @click="textClicked()">
                        <i class="fa fa-align-justify"></i>
                    </b-button>
                    <b-button
                        v-for="mode in [{icon: 'fa fa-pencil-square-o', val:'polygon'}, {icon: 'fa fa-square-o', val: 'box'}]"
                        :key="mode.val"
                        @click="onDrawingModeClick(mode.val)"
                        :pressed="drawingMode === mode.val"
                        :disabled="!isDrawingEnabled"
                        class="sidebarCollapse" 
                    >
                        <i :class="mode.icon"></i>
                    </b-button>
                    <b-button
                        type="button" 
                        class="sidebarCollapse"
                        @click="onDeleteRoi()"
                        :disabled="!isDeleteEnabled"
                    >
                        <i class="fa fa-trash"></i>
                    </b-button>
                      <b-button
                        type="button" 
                        class="sidebarCollapse"
                        @click="onAutoClick()"
                        :disabled="false"
                    >
                      <i class="fa fa-refresh"></i>
                    </b-button>
                </div>
            </div>
        </div>

        <div
            id="text-right-sidebar"
            v-if="!waiting && artefact"
            :class="{ sidebar: isActiveSidebar, text: isActiveText }"
        >
            <text-side :selectedSignInterpretation="selectedSignInterpretation" 
                       :artefact="artefact"
                       @sign-interpretation-clicked="onSignInterpretationClicked($event)">
            </text-side>
        </div>
    </div>
</template>

<script lang="ts">
import { Component, Prop, Vue, Mixins } from 'vue-property-decorator';
import Waiting from '@/components/misc/Waiting.vue';
import ArtefactImage from './artefact-image.vue';
import { Artefact } from '@/models/artefact';
import EditionService from '@/services/edition';
import ArtefactService from '@/services/artefact';
import ArtefactSideMenu from './artefact-side-menu.vue';
import TextSide from './text-side.vue';
import SignCanvas from './SignCanvas.vue';
import SignOverlay from './SignOverlay.vue';
import {
    ArtefactEditorParams,
    ArtefactEditorParamsChangedArgs,
} from './types';
import { ZoomRequestEventArgs } from '@/models/editor-params';
import { IIIFImage, ImageStack } from '@/models/image';
import { Position } from '@/models/misc';
import {
    ImageSetting,
    SingleImageSetting
} from '@/components/image-settings/types';
import { SignInterpretation, InterpretationRoi, Line } from '@/models/text';
import { Polygon } from '@/utils/Polygons';
import { ImagedObject } from '@/models/imaged-object';
import ImagedObjectService from '@/services/imaged-object';
import { BoundingBox } from '@/utils/helpers';
import ImageLayer from './image-layer.vue';
import RoiLayer from './roi-layer.vue';
import BoundaryDrawer, { DrawingMode } from '@/components/polygons/boundary-drawer.vue';
import Zoomer, { ZoomEventArgs } from '@/components/misc/zoomer.vue';
import TextService from '@/services/text';
import SignWheel from './sign-wheel.vue';

@Component({
    name: 'artefact-editor',
    components: {
        'waiting': Waiting,
        'artefact-image': ArtefactImage,
        'artefact-side-menu': ArtefactSideMenu,
        'text-side': TextSide,
        'image-layer': ImageLayer,
        'roi-layer': RoiLayer,
        'boundary-drawer': BoundaryDrawer,
        'zoomer': Zoomer,
        'sign-wheel': SignWheel,
    }
})
export default class ArtefactEditor extends Vue {
    private selectedSignInterpretation: SignInterpretation | null = null;
    private selectedInterpretationRoi: InterpretationRoi | null = null;
    private drawingMode: DrawingMode = 'box';

    private errorMessage = '';
    private waiting = true;
    private saving = false;
    private isActiveSidebar = false;
    private isActiveText = false;
    private params = new ArtefactEditorParams();
    private imageStack: ImageStack | undefined = undefined;
    private boundingBox = new BoundingBox();
    private boundingBoxCenter = { x: 0, y: 0 } as Position;

    private artefactService = new ArtefactService();
    private textService = new TextService();

    private visibleRois: InterpretationRoi[] = [];

    protected get artefact() {
        return this.$state.artefacts.current!;
    }

    protected async mounted() {
        this.waiting = true;
        await this.$state.prepare.artefact(
            parseInt(this.$route.params.editionId),
            parseInt(this.$route.params.artefactId));
        const imagedObject = this.$state.imagedObjects.find(this.artefact.imagedObjectId);
        if (!imagedObject) {
            throw new Error(
                `Can't find imaged object ${this.artefact.imagedObjectId} belonging to artefact ${this.artefact.id}`);
        }
        this.imageStack = this.artefact.side === 'recto' ? imagedObject.recto : imagedObject.verso;
        if (!this.imageStack) {
            throw new Error(`ImagedObject ${this.artefact.imagedObjectId} doesn't contain the ` +
                            `${this.artefact.side} side even though artefact ${this.artefact.id} references it`);
        }
        await this.$state.prepare.imageManifest(this.imageStack.master);
        this.params.rotationAngle = this.artefact.mask.transformation.rotate || 0;
        this.fillImageSettings();
        this.calculateBoundingBox();
        this.initVisibleRois();

        this.waiting = false;
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
    // On computer screen - Active means closed, for example sidebar active means the sidebar is closed.
    // On tablet screen - Active means opened.

    private get imageWidth(): number {
        return this.masterImage.manifest.width;
    }

    private get imageHeight(): number {
        return this.masterImage.manifest.height;
    }

    private get actualWidth(): number {
        return this.boundingBox.width * this.zoomLevel;
    }

    private get actualHeight(): number {
        return this.boundingBox.height * this.zoomLevel;
    }

    private get actualBoundingBox(): string {
        return `${this.boundingBox.x * this.zoomLevel} ${this.boundingBox.y * this.zoomLevel } ` +
               `${this.actualWidth} ${this.actualHeight}`;
    }

    private get isDrawingEnabled() {
        return !!this.selectedSignInterpretation && !this.selectedInterpretationRoi;
    }

    private get isDeleteEnabled() {
        return !!this.selectedInterpretationRoi;
    }

    private get rotationAngle(): number {
        return this.params.rotationAngle;
    }

    private onNewZoom(event: ZoomEventArgs) {
        this.params.zoom = event.zoom;
    }

    private get transform(): string {
        const zoom = `scale(${this.zoomLevel})`;
        const rotate = `rotate(${this.rotationAngle}  ${this.boundingBoxCenter.x}  ${this.boundingBoxCenter.y})`;

        return `${zoom} ${rotate}`;
    }

    private get selectedLine(): Line | null {
        if (!this.selectedSignInterpretation) {
            return null;
        }

        return this.selectedSignInterpretation.sign.line;
    }

    private sidebarClicked() {
        this.isActiveSidebar = !this.isActiveSidebar;
    }

    private textClicked() {
        this.isActiveText = !this.isActiveText;
    }

    private onParamsChanged(evt: ArtefactEditorParamsChangedArgs) {
        this.params = evt.params; // This makes sure a change is triggered in child components
    }

    private fillImageSettings() {
        if (!this.imageStack) {
            throw new Error(`No image stack for artefact ${this.artefact.id} in artefact-editor`);
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

    private calculateBoundingBox() {
        // We want to support rotation without moving or scroll the artefact. This requires a little
        // math. We start with the artefact's actual bounding box, which is a rectangle. We need to calculate the
        // bounding box that will contain all the possible rotations of the artefact's original bounding box.
        // This is pretty easy to do - take the diagonal of the original bounding box, and build a square with a
        // side of that size. The square's center should be the center of the original bounding box.
        //
        // We ask the server to cut the image at the square, and treat everything as square. That way when we
        // rotate everything is still visible.
        const bb = this.artefact.mask.polygon.getBoundingBox();
        const diag = Math.sqrt((bb.height * bb.height) + (bb.width * bb.width));
        const center = this.boundingBoxCenter = {
            x: bb.x + bb.width / 2,
            y: bb.y + bb.height / 2,
        } as Position;

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
            if (roi.status !== 'deleted' && roi.artefactId === this.artefact.id) {
                this.visibleRois.push(roi);
            }
        }
    }

    private onSignInterpretationClicked(si: SignInterpretation) {
        this.selectedSignInterpretation = si;
        this.selectedInterpretationRoi = si.artefactRoi(this.artefact) || null;
    }

    private onRoiClicked(ir: InterpretationRoi) {
        this.selectedInterpretationRoi = ir;

        if (!ir.signInterpretationId) {
            this.selectedSignInterpretation = null;
        } else {
            const si = this.$state.signInterpretations.get(ir.signInterpretationId);
            this.selectedSignInterpretation = si || null;
        }
    }

    private onDrawingModeClick(newMode: DrawingMode) {
        this.drawingMode = newMode;
    }

    private onNewPolygon(poly: Polygon) {
        if (!this.selectedSignInterpretation) {
            console.error("Can't add ROI with no selected sign");
            return;
        }

        const bbox = poly.getBoundingBox();
        const normalized = Polygon.offset(poly, -bbox.x, -bbox.y);
        const roi = InterpretationRoi.new(this.artefact,
                this.selectedSignInterpretation,
                normalized,
                bbox);

        this.selectedSignInterpretation.rois.push(roi);
        this.$state.interpretationRois.put(roi);
        this.visibleRois.push(roi);
        this.selectedInterpretationRoi = roi;
    }

    private onDeleteRoi() { // Delete the selected ROI
        const roi = this.selectedInterpretationRoi;
        const si = this.selectedSignInterpretation;
        if (!roi || !si) {
            console.error("Can't delete an ROI if nothing is selected");
            return;
        }
        roi.status = 'deleted';
        si.deleteRoi(roi);

        const visIndex = this.visibleRois.findIndex(r => r.id === roi.id);
        this.visibleRois.splice(visIndex, 1);
        this.selectedInterpretationRoi = null;
    }

    private async onSave() {
        const as = new ArtefactService();

        this.saving = true;
        try {
            const appliedRotation = await this.saveRotation();
            const appliedROIs =  await this.saveROIs();

            if (!appliedRotation && !appliedROIs) {
                this.showMessage('No changes to save', 'info');
            } else {
                this.showMessage('Artefact Saved', 'success');
            }
        } catch (e) {
            this.showMessage('Saving Artefact Failed', 'error');
        }
        this.saving = false;
    }

    private async saveRotation() {
        const rotation = this.rotationAngle % 360;
        if (rotation === this.artefact.mask.transformation.rotate) {
            return false;
        }

        this.artefact.mask.transformation.rotate = this.rotationAngle % 360;
        await this.artefactService.changeArtefact(this.artefact.editionId, this.artefact);
        return true;
    }

    private async saveROIs() {
        const selected = this.selectedSignInterpretation;

        const updated = await this.textService.updateArtefactROIs(this.artefact);
        this.initVisibleRois();
        if (selected) {  // Make sure we select again, as the ROIs might have changed
            this.onSignInterpretationClicked(selected);
        }

        return updated > 0;
    }

    private showMessage(msg: string, type: string = 'info') {
        this.$toasted.show(msg, {
            type,
            position: 'top-right',
            duration: 7000
        });
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
    width: calc((100vw - 330px) / 2);
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

// TODO -- update the madia
@media (max-width: 1100px) {
    /* Reversing the behavior of the sidebar:
       it'll be rotated vertically and off canvas by default,
       collapsing in on toggle button click with removal of
       the vertical rotation.   */
    #sidebar {
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
        width: calc((100vw - 330px) / 2);
    }

    .artefact-container.text {
        overflow: scroll;
        position: relative;
        padding: 0;
        height: calc(100vh - 63px);
        width: calc((100vw - 80px) / 2);
    }

    .artefact-container.sidebar {
        overflow: scroll;
        position: relative;
        padding: 0;
        height: calc(100vh - 63px);
        width: calc(100vw - 330px);
    }

    .artefact-container {
        overflow: scroll;
        position: relative;
        padding: 0;
        height: calc(100vh - 63px);
        width: calc(100vw - 80px);
    }

    #text-right-sidebar {
        margin-right: calc((-100vw + 80px) / 2);
    }

    #text-right-sidebar.sidebar.text {
        width: calc((100vw - 330px) / 2);
        transform: rotateY(0deg);
    }

    #text-right-sidebar.text {
        width: calc((100vw - 80px) / 2);
    }

    #text-right-sidebar.sidebar {
        margin-right: calc(-100vw + 330px);
    }
}
</style>
