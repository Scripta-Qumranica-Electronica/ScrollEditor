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
                @paramsChanged="onParamsChanged($event)"
            ></artefact-side-menu>
        </div>

        <div v-if="!waiting && artefact">
            <div class="row" id="artefact-and-buttons">
                <div class="buttons-div">
                    <b-button type="button" class="sidebarCollapse" @click="sidebarClicked()">
                        <i class="fa fa-align-justify"></i>
                    </b-button>
                </div>
                <div
                    class="artefact-container"
                    :class="{ sidebar: isActiveSidebar, text: isActiveText }"
                >
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
                            <!-- <roi-layer :rois="visibleRois" @click="roiClicked($event)"/> -->
                         </g>
                    </svg>
                    <!--
                    <div>
                        <artefact-image
                            class="overlay-canvas"
                            v-if="artefact"
                            :artefact="artefact"
                            :scale="scale"
                            :imageSettingsParams="params.imageSettings"
                        ></artefact-image>
                        <sign-overlay
                            :signs="arrayOfSigns"
                            :selectedSignId="clickedSignId"
                            class="overlay-canvas"
                            :originalImageWidth="originalImageWidth"
                            :originalImageHeight="originalImageHeight"
                            :scale="scale"
                            @polygonChanged="polygonChanged($event)"
                        />
                        <sign-canvas
                            v-show="sign.signId"
                            class="overlay-canvas"
                            :id="`${sign.signId}_sign_canvas`"
                            :shapeSign="sign"
                            :originalImageWidth="originalImageWidth"
                            :originalImageHeight="originalImageHeight"
                            :scale="scale"
                            :params="params"
                            @SignChanged="signChanged($event)"
                        />
                    </div> -->
                </div>
                <div class="buttons-div">
                    <b-button type="button" class="sidebarCollapse" @click="textClicked()">
                        <i class="fa fa-align-justify"></i>
                    </b-button>
                    <b-button
                        v-for="mode in [{icon: 'fa fa-pencil-square-o', val:'POLYGON'}, {icon: 'fa fa-square-o', val: 'RECTANGLE'}]"
                        :key="mode.val"
                        @click="editingModeChanged(mode.val)"
                        :pressed="modeChosen(mode.val)"
                        class="sidebarCollapse"
                    >
                        <i :class="mode.icon"></i>
                    </b-button>
                    <b-button type="button" class="sidebarCollapse" @click="deletePolygon()">
                        <i class="fa fa-trash"></i>
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
import ArtefactSideMenu from './ArtefactSideMenu.vue';
import TextSide from './text-side.vue';
import SignCanvas from './SignCanvas.vue';
import SignOverlay from './SignOverlay.vue';
import {
    ArtefactEditorParams,
    ArtefactEditorParamsChangedArgs,
    DrawingShapesMode,
    ShapeSign
} from './types';
import { ZoomRequestEventArgs } from '@/models/editor-params';
import { IIIFImage, ImageStack } from '@/models/image';
import { Position } from '@/utils/PointerTracker';
import {
    ImageSetting,
    SingleImageSetting
} from '@/components/image-settings/types';
import { SignInterpretation } from '@/models/text';
import { Polygon } from '@/utils/Polygons';
import { ImagedObject } from '@/models/imaged-object';
import ImagedObjectService from '@/services/imaged-object';
import { BoundingBox } from '@/utils/helpers';
import ImageLayer from './image-layer.vue';
import RoiLayer from './roi-layer.vue';
import BoundaryDrawer from '@/components/polygons/boundary-drawer.vue';

@Component({
    name: 'artefact-editor',
    components: {
        'waiting': Waiting,
        'artefact-image': ArtefactImage,
        'artefact-side-menu': ArtefactSideMenu,
        'text-side': TextSide,
        'sign-canvas': SignCanvas,
        'sign-overlay': SignOverlay,
        'image-layer': ImageLayer,
        'roi-layer': RoiLayer,
        'boundary-drawer': BoundaryDrawer,
    }
})
export default class ArtefactEditor extends Vue {
    private selectedSignInterpretation: SignInterpretation | null = null;
    private clickedSignId = 0;
    private showShapeChoice = false;
    private arrayOfSigns =  [] as ShapeSign[];
    private shapeChoice = DrawingShapesMode.POLYGON;
    private errorMessage = '';
    private waiting = true;
    private editionService = new EditionService();
    private imagedObjectService = new ImagedObjectService();
    private artefactService = new ArtefactService();
    private isActiveSidebar = false;
    private isActiveText = false;
    private params = new ArtefactEditorParams();
    private sign = {} as ShapeSign;
    private scale = 0.5;
    private imageStack: ImageStack | undefined = undefined;
    private masterImageManifest = null;
    private boundingBox = new BoundingBox();
    private boundingBoxCenter = { x: 0, y: 0 } as Position;

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
        this.masterImageManifest = this.imageStack.master.manifest;
        this.fillImageSettings();
        this.calculateBoundingBox();

        this.waiting = false;

        this.$root.$on('isClicked', (data: SignInterpretation) => {
            this.clickedSignId = data.signInterpretationId;
            const objectSign = {
                signId: data.signInterpretationId,
                char: data.character,
                shape: this.shapeChoice,
                polygon: new Polygon()
            } as ShapeSign;
            const signIndex = this.arrayOfSigns.findIndex(
                (sign: ShapeSign) => data.signInterpretationId === sign.signId
            );

            if (signIndex < 0) {
                this.arrayOfSigns.push(objectSign);
            } else {
                // update the polygon
                objectSign.polygon = this.arrayOfSigns[signIndex].polygon;
                this.arrayOfSigns[signIndex] = objectSign;
            }

            this.sign = objectSign;
            // this.prepareNonSelectedSigns();
        });
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

    private get actualX(): number {
        return this.boundingBox.x * this.zoomLevel;
    }

    private get actualY(): number {
        return this.boundingBox.y * this.zoomLevel;
    }

    private get actualBoundingBox(): string {
        return `${this.actualX} ${this.actualY} ` +
               `${this.actualWidth} ${this.actualHeight}`;
    }

    private get rotationAngle(): number {
        return this.params.rotationAngle;
    }

    private deletePolygon() {
        const signIndex = this.arrayOfSigns.findIndex(
            (sign: ShapeSign) => this.clickedSignId === sign.signId
        );
        if (signIndex < 0) {
            console.error('There is no object of the clicked sign');
            return;
        }
        this.arrayOfSigns.splice(signIndex, 1);
        this.sign = {} as ShapeSign;
    }

    private signChanged(polygon: Polygon) {
        const signIndex = this.arrayOfSigns.findIndex(
            (s: ShapeSign) => this.sign.signId === s.signId
        );
        if (signIndex < 0) {
            throw new Error("Sign doesn't exist");
        }
        this.arrayOfSigns[signIndex].polygon = polygon;
        // this.prepareNonSelectedSigns();
        this.sign = {} as ShapeSign;
    }

    private polygonChanged(signId: number) {
        const signIndex = this.arrayOfSigns.findIndex(
            (s: ShapeSign) => signId === s.signId
        );
        if (signIndex < 0) {
            throw new Error("Sign doesn't exist");
        }
        this.clickedSignId = signId;
    }

    private get transform(): string {
        const zoom = `scale(${this.zoomLevel})`;
        const rotate = `rotate(${this.rotationAngle}  ${this.boundingBoxCenter.x}  ${this.boundingBoxCenter.y})`;

        return `${zoom} ${rotate}`;
    }

    // prepareNonSelectedSigns() {
    // this.nonSelectedSigns = this.arrayOfSigns.filter(
    //   (sign: ShapeSign) => sign.signId !== this.clickedSignId
    // );
    // },
    private modeChosen(val: DrawingShapesMode): boolean {
        return (
            DrawingShapesMode[val].toString() ===
            this.shapeChoice.toString()
        );
    }

    private editingModeChanged(val: any) {
        (this as any).shapeChoice = DrawingShapesMode[val];
        const signIndex = this.arrayOfSigns.findIndex(
            (sign: ShapeSign) => this.clickedSignId === sign.signId
        );
        if (this.arrayOfSigns[signIndex]) {
            this.arrayOfSigns[signIndex].shape = this.shapeChoice;
        }
        this.sign.shape = this.shapeChoice;
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

    private onSignInterpretationClicked(si: SignInterpretation) {
        this.selectedSignInterpretation = si;
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
