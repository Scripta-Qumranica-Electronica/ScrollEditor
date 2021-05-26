<template>

    <b-container fluid no-gutters align-v="center" align-h="center"
                 class="mt-1 mb-1 ml-1 p-0 pl-1 top-toolbar "
                 id="scrollTopbar" >

        <b-row align-v="center" no-gutters class="m-0 p-0 ml-0 mr-1 pr-2  topbar-row" >


            <b-col no-gutters
            class="mt-0 mb-2 mr-1 ml-0 pl-1 col-2 col-xl-1 col-lg-2 col-md-2 col-sm-2 col-xs-2">

               <b-button-group>


                    <b-button
                        id="material-mode-btn"
                        class="btn-xs mode-btn ml-0 mr-1 mb-4 mt-2"
                        size="sm"
                        autofocus
                        :variant="materialVariant"
                        :pressed.sync="inMaterialMode"
                        text-center
                        @click="onTextMode('material')"
                    >
                        Material Mode
                    </b-button>

                    <b-button
                        id="text-mode-btn"
                        class="btn-xs mode-btn btn-sm-ex ml-1 mr-0 mb-4 mt-2 "
                        size="sm"
                        :variant="textVariant"
                        :pressed.sync="inTextMode"
                        text-center
                        @click="onTextMode('text')"
                    >
                        Text Mode
                    </b-button>

                </b-button-group>
            </b-col>


            <b-col no-gutters align-h="center" class="col-2 col-xl-2 col-lg-2 col-md-2 col-sm-3 col-xs-3 mb-2 ml-0 mr-0 position-zoom col-zm-sm">

                <zoom-toolbar
                        class="mb-4 mt-2"
                        v-model="localZoom"
                        delta="0.05"
                        @zoomChanged="onZoomChanged($event)"
                />
            </b-col>

            <b-col no-gutters class="col-3 col-xl-3 col-lg-3 col-md-3 col-sm-4 col-xs-6 m-0 ml-0 mr-0 col-zm-sm">

                <b-card-body class="card-body-cancel m-0 mb-1 p-0">
                    <section class="m-0 p-0" >

                        <b-row no-gutters align-v="center" >

                            <b-button-group>

                                <b-button
                                    pill
                                    class="btn-sm btn-sm-ex ml-0 mb-4 mt-2"
                                    size="sm"
                                    variant="dark"
                                    text-center
                                    :disabled="
                                    !(
                                        selectedArtefacts &&
                                        selectedArtefacts.length
                                    )
                                    "
                                    @click="zoomArtefact(1)"
                                >
                                    <i class="fa fa-plus"></i>
                                </b-button>

                                <b-button
                                    pill
                                    class="btn-sm btn-sm-ex ml-1 mb-4 mt-2"
                                    size="sm"
                                    variant="dark"
                                    text-center
                                    :disabled="
                                    !(
                                        selectedArtefacts &&
                                        selectedArtefacts.length
                                    )
                                    "
                                    @click="zoomArtefact(-1)"
                                >
                                    <i class="fa fa-minus"></i>
                                </b-button>

                                <b-button
                                    pill
                                    class="btn-sm btn-sm-ex ml-1 mb-4 mt-2"
                                    size="sm"
                                    variant="dark"
                                    text-center
                                    :disabled="
                                    !(
                                        selectedArtefacts &&
                                        selectedArtefacts.length
                                    )
                                    "
                                    @click="resetZoom()"
                                    >reset
                                </b-button
                                >
                            </b-button-group>

                            <b-col class="m-1 mb-1 mt-0 col-5 col-xl-3 col-lg-4 col-md-4 col-sm-4 col-xs-4">
                                <b-form-input
                                    id="input-small"
                                    class="mb-4 mt-2"
                                    size="sm"
                                    type="number"
                                    v-model="params.scale"
                                    :disabled="
                                    !(
                                        selectedArtefacts &&
                                        selectedArtefacts.length
                                    )
                                    "
                                >
                                </b-form-input>
                            </b-col>

                            <b-col no-gutters text-center
                                :class="[
                                    !(
                                        selectedArtefacts &&
                                        selectedArtefacts.length
                                    )? 'text-muted col-1 mt-2 mb-4 mr-0'
                                    : 'col-1 mt-2 mb-4 mr-0'
                                    ]"
                            > %

                            </b-col>

                        </b-row>

                    </section >
                </b-card-body>

            </b-col>



            <b-col text-center no-gutters
                    class="col-4 col-xl-4 col-lg-4 col-md-4 col-sm-3 col-xs-3 col-zm-md ml-0 mr-0">

                <b-card-body text-center class="card-body-cancel m-0 mb-1 p-0">

                    <section class="m-0 p-0" no-gutters>

                        <b-row no-gutters align-v="center" >
                            <b-button-group>

                                <b-button
                                    pill
                                    class="btn-sm btn-sm-ex ml-0 mb-4 mt-2"
                                    size="sm"
                                    variant="dark"
                                    text-center
                                    :disabled="
                                    !(
                                        selectedArtefacts &&
                                        selectedArtefacts.length
                                    )
                                    "
                                    @click="rotateGroupArtefact(-1)"
                                >
                                    <font-awesome-icon icon="undo">
                                    </font-awesome-icon>
                                </b-button>

                                <b-button
                                    pill
                                    class="btn-sm btn-sm-ex ml-1 mb-4 mt-2"
                                    size="sm"
                                    variant="dark"
                                    text-center
                                    :disabled="
                                    !(
                                        selectedArtefacts &&
                                        selectedArtefacts.length
                                    )
                                    "
                                    @click="rotateGroupArtefact(1)"
                                >
                                    <font-awesome-icon icon="redo" >
                                    </font-awesome-icon>
                                </b-button>

                            </b-button-group>
                            <b-col class="m-1 mb-1 mt-0 col-5 col-xl-2 col-lg-3 col-md-3 col-sm-4 col-xs-4">


                                <b-form-input
                                    id="input-small"
                                    class="mb-4 mt-2"
                                    size="sm"
                                    type="number"
                                    v-model="params.rotate"
                                        :disabled="
                                    !(
                                        selectedArtefacts &&
                                        selectedArtefacts.length
                                    )
                                    "
                                ></b-form-input>
                            </b-col>


                           <b-col no-gutters text-center
                                :class="[
                                    !(
                                        selectedArtefacts &&
                                        selectedArtefacts.length
                                    )? 'text-muted col-1 mb-4 mt-2'
                                    : 'col-1 mb-4 mt-2'
                                    ]"

                            > deg'
                            </b-col>

                            <b-col no-gutters text-center class="col-2 ml-4 mt-2 mb-1">
                                <b-button
                                pill
                                class="btn-sm btn-sm-ex ml-1 mb-4 mt-2"
                                size="sm"
                                variant="dark"
                                @click="statusMirror()"

                                :disabled="
                                    !(
                                        selectedArtefacts &&
                                        selectedArtefacts.length
                                    )
                                "
                                >
                            mirror
                                </b-button>
                            </b-col>
                        </b-row>



                    </section>
                </b-card-body>

            </b-col>



            <b-col text-center align-v="center" no-gutters
                    class="col-3 col-xl-3 col-lg-3 col-md-3 col-sm-6 col-xs-6 ml-0 mr-1 col-zm-sm">

                <b-card-body text-center class="card-body-cancel m-0 mb3 p-0">

                     <section class="mb-3 mt-0 p-0" no-gutters align-v="center" text-center>

                        <b-row no-gutters align-v="end" >
                            <div>
                                <table>
                                    <tr>
                                        <td></td>
                                        <td>
                                            <b-button
                                                class="btn-xs mt-1"
                                                size="sm"
                                                variant="dark"
                                                :disabled="
                                                    !(
                                                        selectedArtefacts &&
                                                        selectedArtefacts.length
                                                    )
                                                "
                                                @click="
                                                    dragArtefact(0, -1)
                                                "
                                            >
                                                <i
                                                    class="fa fa-arrow-up"
                                                ></i>
                                            </b-button>
                                        </td>
                                        <td></td>
                                    </tr>
                                    <tr>
                                        <td>
                                            <b-button
                                                class="btn-xs ml-2 mb-3"
                                                size="sm"
                                                variant="dark"
                                                :disabled="
                                                    !(
                                                        selectedArtefacts &&
                                                        selectedArtefacts.length
                                                    )
                                                "
                                                @click="
                                                    dragArtefact(-1, 0)
                                                "
                                            >
                                                <i
                                                    class="fa fa-arrow-left"
                                                ></i>
                                            </b-button>
                                        </td>
                                        <td>
                                            <b-button
                                                class="btn-xs mb-3"
                                                size="md"
                                                variant="dark"
                                                :disabled="
                                                    !(
                                                        selectedArtefacts &&
                                                        selectedArtefacts.length
                                                    )
                                                "
                                                @click="
                                                    dragArtefact(0, 1)
                                                "
                                            >
                                                <i
                                                    class="fa fa-arrow-down"
                                                ></i>
                                            </b-button>
                                        </td>
                                        <td>
                                            <b-button
                                                class="btn-xs mb-3"
                                                size="sm"
                                                variant="dark"
                                                :disabled="
                                                    !(
                                                        selectedArtefacts &&
                                                        selectedArtefacts.length
                                                    )
                                                "
                                                @click="
                                                    dragArtefact(1, 0)
                                                "
                                            >
                                                <i
                                                    class="fa fa-arrow-right"
                                                ></i>
                                            </b-button>
                                        </td>
                                    </tr>
                                </table>
                            </div>


                            <b-col class="m-1 mb-3 mt-0 ml-2 col-3 col-xl-3 col-lg-3 col-md-4 col-sm-4 col-xs-4">
                                <b-form-input
                                    id="input-small"
                                    size="sm"
                                    type="number"
                                    text-center
                                    v-model="params.move"
                                    :disabled="
                                    !(
                                        selectedArtefacts &&
                                        selectedArtefacts.length
                                    )
                                    "
                                ></b-form-input>
                            </b-col>

                            <b-col no-gutters text-center
                                :class="[
                                    !(
                                        selectedArtefacts &&
                                        selectedArtefacts.length
                                    )? 'text-muted col-1 mt-1 mb-3'
                                    : 'col-1 mt-1 mb-3'
                                    ]"
                            > mm
                            </b-col>

                        </b-row>


                    </section >
                </b-card-body>

            </b-col>


        </b-row>

    </b-container>
</template>

<script lang="ts">
import { Component, Emit, Model, Prop, Vue } from 'vue-property-decorator';

import { ScrollEditorState } from '@/state/scroll-editor';
import ZoomToolbar from '@/components/toolbars/zoom-toolbar.vue';

import { EditionManuscriptMetricsDTO } from '@/dtos/sqe-dtos';
import { ScrollEditorParams, ScrollEditorOpMode } from '../artefact-editor/types';
import { Placement } from '@/utils/Placement';
import { Artefact } from '@/models/artefact';
import { Point } from '../../utils/helpers';
import { ScrollEditorMode } from '@/state/scroll-editor';
import {
    ArtefactPlacementOperation,
    ArtefactPlacementOperationType,
    GroupPlacementOperation,
    ScrollEditorOperation,
} from './operations';

@Component({
    name: 'scroll-top-toolbar',
    components: {
        'zoom-toolbar': ZoomToolbar,
    },
})

export default class ScrollTopToolbar extends Vue {

    @Model ('zoomChangedGlobal', {type: Number}) private paramsZoom!: number;

    @Prop({ default: -1 }) public artefactId!: number;

    @Emit()
    private newOperation(op: ScrollEditorOperation) {
        return op;
    }

    private selectedSide: string = 'left';
    private metricsInput: number = 1;

    private sidesOptions: Array<{ text: string; value: string }> = [
        { text: 'Left', value: 'left' },
        { text: 'Right', value: 'right' },
        { text: 'Top', value: 'top' },
        { text: 'Down', value: 'down' },
    ];

    private keyboardInput: boolean = true;
    // private float: boolean = true;
    private ver1: boolean = true;
    private zoomDelta!: number;

    private localZoom: number = this.paramsZoom || 0.01;

    private onZoomChanged(val: number) {
        this.localZoom = val;
        this.$emit('zoomChangedGlobal', val);

    }

    private get inTextMode(): boolean {
        return ('text' === this.scrollEditorState.mode);
    }

    // Computed properties are by default getter-only,
    // but we also provide a dummy setter to avoid this warning:
    // Computed property "inTextMode" was assigned to but it has no setter

    private set inTextMode(val: boolean) {
        const param = 1;
    }

    private get inMaterialMode(): boolean {
        return  ( 'material' === this.scrollEditorState.mode);
    }

    // Computed properties are by default getter-only,
    // but we also provide a dummy setter to avoid this warning:
    // Computed property "inTextMode" was assigned to but it has no setter

    private set inMaterialMode(val: boolean) {
         const param = 1;
    }

    private get textVariant(): string {
       return ( ('text' === this.scrollEditorState.mode) ?
                 'info' : 'outline-secondary' );
    }

    private get materialVariant(): string {
       return ( ('material' === this.scrollEditorState.mode) ?
                'info' : 'outline-secondary' );
    }

    protected mounted() {
        if (this.keyboardInput) {
            window.addEventListener('keydown', this.onKeyPress);
        }

        const materialBtn =
                document.querySelector('#material-mode-btn')!;
        const textBtn =
                document.querySelector('#text-mode-btn')!;

        materialBtn.addEventListener('focusout', (event) => {
             if ( 'material' === this.scrollEditorState.mode) {
                materialBtn.classList.add('btn-selected');
            } else if ( 'text' === this.scrollEditorState.mode) {
                materialBtn.classList.remove('btn-selected');
            }
        });


        textBtn.addEventListener('focusout', (event) => {
            if ( 'text' === this.scrollEditorState.mode) {
                textBtn.classList.add('btn-selected');
            } else if ( 'material' === this.scrollEditorState.mode) {
                textBtn.classList.remove('btn-selected');
            }

        });


    }

    // router re enter page
    public beforeEnter() {
        const materialBtn =
                document.getElementById('material-mode-btn')!;
        const textBtn =
                document.getElementById('text-mode-btn')!;

        const curTopBar = document.getElementById('scroll-topbar')!;

        curTopBar.addEventListener('focusout', (event) => {
             if ( 'material' === this.scrollEditorState.mode) {
                 materialBtn.focus();
            } else if ( 'text' === this.scrollEditorState.mode) {
                textBtn.focus();
            }
        });


    }

    public destroyed() {
        if (this.keyboardInput) {
            window.removeEventListener('keydown', this.onKeyPress);
        }
    }



    private get mode(): ScrollEditorOpMode {
        return this.params!.mode;
    }

    private setMode(mode: ScrollEditorOpMode) {
        this.params.mode = mode;
    }

    private onKeyPress(event: KeyboardEvent) {
        if (this.artefact) {
            return;
        }

        switch (event.code) {
            case 'KeyM':
                this.setMode('move');
                break;
            case 'KeyR':
                this.setMode('rotate');
                break;
            case 'KeyS':
                this.setMode('scale');
                break;
            case 'ArrowLeft':
                if (this.mode === 'move') {
                    this.dragArtefact(-1, 0);
                    event.preventDefault();
                } else if (this.mode === 'rotate') {
                    this.rotateGroupArtefact(-1);
                    event.preventDefault();
                }
                break;
            case 'ArrowRight':
                if (this.mode === 'move') {
                    this.dragArtefact(1, 0);
                    event.preventDefault();
                } else if (this.mode === 'rotate') {
                    this.rotateGroupArtefact(1);
                    event.preventDefault();
                }
                break;
            case 'ArrowUp':
                if (this.mode === 'move') {
                    this.dragArtefact(0, -1);
                    event.preventDefault();
                } else if (this.mode === 'scale') {
                    this.zoomArtefact(1);
                    event.preventDefault();
                }
                break;
            case 'ArrowDown':
                if (this.mode === 'move') {
                    this.dragArtefact(0, 1);
                    event.preventDefault();
                } else if (this.mode === 'scale') {
                    this.zoomArtefact(-1);
                    event.preventDefault();
                }
                break;
        }
    }

    private get edition() {
        return this.$state.editions.current! || {};
    }

    private get scrollEditorState(): ScrollEditorState {
        return this.$state.scrollEditor;
    }

    private get params(): ScrollEditorParams {
        return this.scrollEditorState.params || new ScrollEditorParams();
    }


    private onTextMode(value: ScrollEditorMode) {
        this.scrollEditorState.mode = value;

        const materialBtn =
                document.getElementById('material-mode-btn')!;
        const textBtn =
                document.getElementById('text-mode-btn')!;

        if ( 'material' === this.scrollEditorState.mode) {
            materialBtn.focus();
        } else if ( 'text' === this.scrollEditorState.mode) {
            textBtn.focus();
        }

    }


    private get artefacts() {
        return this.$state.artefacts.items || [];
    }

    private get selectedArtefacts() {
        return this.scrollEditorState.selectedArtefacts;
    }
    private get placedArtefacts() {
        return this.artefacts.filter((x) => x.isPlaced);
    }

    private get artefact() {
        return this.$state.artefacts.find(this.artefactId);
    }

    public get selectedArtefact() {
        return this.scrollEditorState.selectedArtefact;
    }

    public get selectedGroup() {
        return this.scrollEditorState.selectedGroup;
    }



    public mirrorMode() {
        this.setMode('mirror');
        this.statusMirror();

    }


    public statusMirror() {
        const operations: ArtefactPlacementOperation[] = [];
        let operation: ScrollEditorOperation = {} as ScrollEditorOperation;

        if (this.selectedArtefact) {
            const newPlacement = this.selectedArtefact.placement.clone();

            newPlacement.mirrored = !newPlacement.mirrored;

            operation = this.createOperation(
                // 'mirror',
                'mirror',
                newPlacement,
                this.selectedArtefact
            );
            operation.needsSaving = true;
        }

        // needsSaving: false ?

        if (this.selectedGroup) {
            this.selectedArtefacts.forEach((art) => {
                const newPlacement = art.placement.clone();
                newPlacement.mirrored = !newPlacement.mirrored;
                operations.push(
                    this.createOperation('mirror', newPlacement, art)
                );
            });
            operation = new GroupPlacementOperation(
                this.selectedGroup.groupId,
                operations,
                'placement'
            );
        }

        this.newOperation(operation);

    }



    public getGroupCenter(): Point {
        const minX = Math.min(
            ...this.selectedArtefacts.map((art) => art.placement.translate.x!)
        );
        const minY = Math.min(
            ...this.selectedArtefacts.map((art) => art.placement.translate.y!)
        );
        const maxX = Math.max(
            ...this.selectedArtefacts.map(
                (art) => art.placement.translate.x! + art.boundingBox.width
            )
        );
        const maxY = Math.max(
            ...this.selectedArtefacts.map(
                (art) => art.placement.translate.y! + art.boundingBox.height
            )
        );

        const x = (maxX - minX) / 2 + minX;
        const y = (maxY - minY) / 2 + minY;

        return { x, y };
    }

    public getArtefactCenter(art: Artefact): Point {
        // The artefact's center is the translate (x,y) + the bounding box's center
        const x = art.placement.translate.x! + art.boundingBox.width / 2;
        const y = art.placement.translate.y! + art.boundingBox.height / 2;

        return { x, y };
    }

    public dragArtefact(dirX: number, dirY: number) {
        const operations: ScrollEditorOperation[] = [];
        let operation: ScrollEditorOperation = {} as ScrollEditorOperation;
        if (this.selectedArtefact) {
            const placement = this.selectedArtefact.placement.clone();
            const jump =
                parseInt(this.params.move.toString()) * this.edition.ppm;
            placement!.translate.x! += jump * dirX;
            placement!.translate.y! += jump * dirY;
            operation = this.createOperation(
                'translate',
                placement,
                this.selectedArtefact
            );
        }
        if (this.selectedGroup) {
            this.selectedArtefacts.forEach((art) => {
                const placement = art.placement.clone();
                const jump =
                    parseInt(this.params.move.toString()) * this.edition.ppm;
                placement!.translate.x! += jump * dirX;
                placement!.translate.y! += jump * dirY;
                operations.push(
                    this.createOperation('translate', placement, art)
                );
            });
            operation = new GroupPlacementOperation(
                this.selectedGroup.groupId,
                operations
            );
        }
        this.newOperation(operation);
    }


    public translateArtefactAfterGroupRotation(
        art: Artefact,
        groupCenterPoint: Point,
        deltaAngleRadians: number
    ): Point {
        const sin = Math.sin(deltaAngleRadians);
        const cos = Math.cos(deltaAngleRadians);
        const artefactCenterPoint = this.getArtefactCenter(art);

        const xFromOrigin = artefactCenterPoint.x - groupCenterPoint.x;
        const yFromOrigin = artefactCenterPoint.y - groupCenterPoint.y;

        const newMidXArt = cos * xFromOrigin - sin * yFromOrigin;
        const newMidYArt = cos * yFromOrigin + sin * xFromOrigin;

        const deltaX = newMidXArt - xFromOrigin;
        const deltaY = newMidYArt - yFromOrigin;

        return {
            x: art.placement.translate.x! + deltaX,
            y: art.placement.translate.y! + deltaY,
        } as Point;
    }

    public zoomArtefact(direction: number) {
        const operations: ScrollEditorOperation[] = [];
        let operation: ScrollEditorOperation = {} as ScrollEditorOperation;
        if (this.selectedArtefact) {
            const trans = this.selectedArtefact.placement.clone();
            if (direction === 1) {
                this.zoomDelta = trans.scale + this.params.scale / 100;
            } else {
                this.zoomDelta = trans.scale - this.params.scale / 100;
            }
            if (!trans.scale) {
                trans.scale = 1;
            }
            trans.scale = this.zoomDelta;
            trans.scale = +trans.scale.toFixed(4);
            operation = this.createOperation(
                'scale',
                trans,
                this.selectedArtefact
            );
        }
        if (this.selectedGroup) {
            this.selectedArtefacts.forEach((art) => {
                const trans = art.placement.clone();
                if (direction === 1) {
                    this.zoomDelta = trans.scale + this.params.scale / 100;
                } else {
                    this.zoomDelta = trans.scale - this.params.scale / 100;
                }
                if (!trans.scale) {
                    trans.scale = 1;
                }
                trans.scale = this.zoomDelta;
                trans.scale = +trans.scale.toFixed(4);
                operations.push(this.createOperation('scale', trans, art));
            });

            operation = new GroupPlacementOperation(
                this.selectedGroup.groupId,
                operations
            );
        }
        this.newOperation(operation);
    }


    public rotateGroupArtefact(direction: number) {
        const operations: ScrollEditorOperation[] = [];
        let operation: ScrollEditorOperation = {} as ScrollEditorOperation;
        const groupCenterPoint = this.getGroupCenter();

        const deltaAngleDegrees = direction * this.params.rotate;
        const deltaAngleRadians = deltaAngleDegrees * (Math.PI / 180);
        if (this.selectedArtefact) {
            const newRotate = this.rotateArtefact(
                this.selectedArtefact,
                deltaAngleDegrees
            );
            const newPlacement = this.selectedArtefact.placement.clone();
            newPlacement.rotate = newRotate;
            operation = this.createOperation(
                'rotate',
                newPlacement,
                this.selectedArtefact
            );
        }
        if (this.selectedGroup) {
            this.selectedArtefacts.forEach((art) => {
                // Rotate each artefact by deltaAngleDegrees
                const newRotate = this.rotateArtefact(art, deltaAngleDegrees);

                // Translate each artefact
                const newTranslate = this.translateArtefactAfterGroupRotation(
                    art,
                    groupCenterPoint,
                    deltaAngleRadians
                );

                const newPlacement = art.placement.clone();
                newPlacement.rotate = newRotate;
                newPlacement.translate = newTranslate;

                operations.push(
                    this.createOperation('rotate', newPlacement, art)
                );
            });
            operation = new GroupPlacementOperation(
                this.selectedGroup.groupId,
                operations
            );
        }
        this.newOperation(operation);
    }

    public rotateArtefact(
        artefact: Artefact,
        deltaAngleDegrees: number
    ): number {
        const oldAngle = artefact.placement.rotate!;

        const newAngle = oldAngle + deltaAngleDegrees;
        const normalizedAngle = ((newAngle % 360) + 360) % 360;
        return normalizedAngle;
    }


    // private createOperation(
    //     opType: ArtefactPlacementOperationType,
    //     newPlacement: Placement,
    //     artefact: Artefact | undefined,
    //     newIsPlaced: boolean
    // ): ArtefactPlacementOperation {
    //     const op = new ArtefactPlacementOperation(
    //         artefact!.id,
    //         opType,
    //         artefact!.placement,
    //         newPlacement,
    //         artefact!.isPlaced,
    //         newIsPlaced
    //     );
    //     artefact!.placement = newPlacement;
    //     artefact!.isPlaced = newIsPlaced;

    //     return op;
    // }


    private createOperation(
        opType: ArtefactPlacementOperationType,
        newPlacement: Placement,
        artefact: Artefact,
        newIsPlaced: boolean = true
    ): ArtefactPlacementOperation {

        artefact.placement = newPlacement;
        const op = new ArtefactPlacementOperation(
            artefact.id,
            opType,
            artefact.placement,
            newPlacement,
            artefact.isPlaced,
            newIsPlaced
        );

        if ( opType === 'mirror' ) {
            op.next.mirrored = true;
            op.needsSaving = true;
        }


        return op;
    }

    public resetZoom() {
        const operations: ScrollEditorOperation[] = [];
        let operation: ScrollEditorOperation = {} as ScrollEditorOperation;
        if (this.selectedArtefact) {
            const trans = this.selectedArtefact.placement.clone();
            trans.scale = 1;
            operation = this.createOperation(
                'scale',
                trans,
                this.selectedArtefact
            );
        }
        if (this.selectedGroup) {
            this.selectedArtefacts.forEach((art) => {
                const trans = art.placement.clone();
                trans.scale = 1;
                operations.push(this.createOperation('scale', trans, art));
            });
            operation = new GroupPlacementOperation(
                this.selectedGroup.groupId,
                operations
            );
        }
        this.newOperation(operation);
    }

}
</script>

<style lang="scss" scoped>
@import '@/assets/styles/_variables.scss';
@import '@/assets/styles/_fonts.scss';

.top-toolbar {
    height: 3rem;
    width: 100vw;
    min-width: 100vw;
    max-width: 100vw;

    @media only screen and (min-width: 1190px) {
        width: 98vw;
        min-width: 95vw;
        max-width: 100vw;
    }

    @media only screen and (min-width: 1480px) {
        width: 90vw;
        min-width: 90vw;
        max-width: 90vw;
    }
}

.topbar-row {
    min-width: 100%;
    width: 100%;
    max-width: 100vw;

}

.btn-xs {
    padding: 0.1rem 0.15rem;
    font-size: 0.75rem;
    line-height: 1;
    border-radius: 0.2rem;
}

.btn-sm-ex {
    padding: 0.2rem 0.25rem;
    font-size: 0.8rem;
    line-height: 1.1;
    border-radius: 0.2rem;
}


.mode-btn {
    /* color: #28a745  !important; */
    color: #8253f0 !important;
    /* border: 2px rgb(69, 4, 247) solid; */
    border-width: 1.2px;
    background-color: #fff !important;
}

.mode-btn:focus {
  outline: 3px solid rgb(113, 230, 210);
  /* box-shadow: none; */
  border-width: 3px;
}
.mode-btn:focus-visible {
  outline: 3px solid rgb(113, 230, 210);
  box-shadow: rgb(113, 230, 210);
  border-width: 3px;
}

.btn-selected {
    border-width: 3px;
}

.col-zm-sm {
    /* max-width: 13vw; */
    max-width: 20%;
}
.col-zm-md {
    /* max-width: 20vw; */
    max-width: 25%;
}

</style>