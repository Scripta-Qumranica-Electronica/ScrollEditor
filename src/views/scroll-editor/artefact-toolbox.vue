<template>
    <div class="row" :class="{ 'mt-2': !float }">
        <b-col class="col-8" v-if="float">
            <section>
                <b-card no-body>
                    <b-card-header header-tag="header" class="p-1" role="tab">
                        <b-button-group size="sm" class="m-1">
                            <b-button
                                class="btn-move"
                                :pill="float"
                                :disabled="
                                    !(
                                        selectedArtefacts &&
                                        selectedArtefacts.length
                                    )
                                "
                                :pressed="mode === 'move'"
                                @click="setMode('move')"
                            >
                                <span v-if="!float"> <u>M</u>ove </span>
                                <font-awesome-icon
                                    v-if="float"
                                    icon="arrows-alt"
                                    size="xs"
                                ></font-awesome-icon>
                            </b-button>
                            <b-button
                                class="btn-scale"
                                :pill="float"
                                :disabled="
                                    !(
                                        selectedArtefacts &&
                                        selectedArtefacts.length
                                    )
                                "
                                :pressed="mode === 'scale'"
                                @click="setMode('scale')"
                            >
                                <span v-if="!float"> <u>S</u>cale </span>
                                <font-awesome-icon
                                    v-if="float"
                                    icon="search"
                                    size="xs"
                                ></font-awesome-icon>
                            </b-button>
                            <b-button
                                class="btn-rotate"
                                :pill="float"
                                :disabled="
                                    !(
                                        selectedArtefacts &&
                                        selectedArtefacts.length
                                    )
                                "
                                :pressed="mode === 'rotate'"
                                @click="setMode('rotate')"
                            >
                                <span v-if="!float"> <u>R</u>otate </span>
                                <font-awesome-icon
                                    v-if="float"
                                    icon="sync"
                                    size="xs"
                                ></font-awesome-icon>
                            </b-button>
                        </b-button-group>
                    </b-card-header>
                    <b-collapse
                        id="accordion-actions"
                        style="display: block"
                        accordion="my-accordion-side-actions"
                        role="tabpanel"
                    >
                        <b-card-body class="card-body-cancel">
                            <section class="center-btn">
                                <b-row
                                    v-if="mode === 'move'"
                                    no-gutters
                                    align-v="end"
                                >
                                    <div>
                                        <table>
                                            <tr>
                                                <td></td>
                                                <td>
                                                    <b-button
                                                        :class="[
                                                            float
                                                                ? 'btn-xs'
                                                                : 'btn-xs',
                                                            'mt-1',
                                                        ]"
                                                        size="sm"
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
                                                        :class="[
                                                            float
                                                                ? 'btn-xs'
                                                                : 'btn-xs',
                                                            ' ml-2 mb-2',
                                                        ]"
                                                        size="sm"
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
                                                        :class="[
                                                            float
                                                                ? 'btn-xs'
                                                                : 'btn-xs',
                                                            'mb-2',
                                                        ]"
                                                        size="sm"
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
                                                        :class="[
                                                            float
                                                                ? 'btn-xs'
                                                                : 'btn-xs',
                                                            'mb-2',
                                                        ]"
                                                        size="sm"
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
                                    <b-col cols="4" class="m-1">
                                        <b-form-input
                                            id="input-small"
                                            size="sm"
                                            type="number"
                                            v-model="params.move"
                                        ></b-form-input> </b-col
                                    >mm
                                </b-row>
                                <b-row
                                    v-if="mode === 'scale'"
                                    no-gutters
                                    align-v="end"
                                >
                                    <b-button-group>
                                        <b-button
                                            :class="[
                                                float ? 'btn-xs' : 'btn-xs',
                                                'ml-1 mb-2',
                                            ]"
                                            size="sm"
                                            @click="zoomArtefact(1)"
                                        >
                                            <i class="fa fa-plus"></i>
                                        </b-button>
                                        <b-button
                                            :class="[
                                                float ? 'btn-xs' : 'btn-xs',
                                                'ml-1 mb-2',
                                            ]"
                                            size="sm"
                                            @click="zoomArtefact(-1)"
                                        >
                                            <i class="fa fa-minus"></i>
                                        </b-button>
                                        <b-button
                                            :class="[
                                                float ? 'btn-xs' : 'btn-xs',
                                                'ml-1 mb-2',
                                            ]"
                                            size="sm"
                                            @click="resetZoom()"
                                            >reset</b-button
                                        >
                                    </b-button-group>
                                    <b-col cols="4" class="mb-1 mt-3 ml-1">
                                        <b-form-input
                                            id="input-small"
                                            size="sm"
                                            type="number"
                                            v-model="params.scale"
                                        ></b-form-input> </b-col
                                    >%
                                </b-row>
                                <b-row
                                    v-if="mode === 'rotate'"
                                    no-gutters
                                    align-v="end"
                                >
                                    <b-button-group>
                                        <b-button
                                            :class="[
                                                float ? 'btn-xs' : 'btn-xs',
                                                'ml-2 mb-2',
                                            ]"
                                            size="sm"
                                            @click="rotateGroupArtefact(-1)"
                                        >
                                            <font-awesome-icon
                                                icon="undo"
                                            ></font-awesome-icon>
                                        </b-button>
                                        <b-button
                                            :class="[
                                                float ? 'btn-xs' : 'btn-xs',
                                                'ml-2 mb-2',
                                            ]"
                                            size="sm"
                                            @click="rotateGroupArtefact(1)"
                                        >
                                            <font-awesome-icon
                                                icon="redo"
                                            ></font-awesome-icon>
                                        </b-button>
                                    </b-button-group>
                                    <b-col cols="4" class="mb-1 mt-3 ml-2 mr-1">
                                        <b-form-input
                                            id="input-small"
                                            size="sm"
                                            type="number"
                                            v-model="params.rotate"
                                        ></b-form-input> </b-col
                                    >degree
                                </b-row>
                            </section>
                        </b-card-body>
                    </b-collapse>
                </b-card>
            </section>
        </b-col>
        <b-col class="col-8">
            <section v-if="!float" class="center-btn" style="border:1px solid #dee2e6">
                        <div class="row">
                        <b-button-group class="ml-4">
                            <b-button
                                 class="m-1"
                                 size="sm"
                                :pill="float"
                                :pressed="mode === 'manageGroup'"
                                @click="setMode('manageGroup')"
                                :disabled="
                                    !(
                                        selectedArtefacts &&
                                        selectedArtefacts.length
                                    )
                                "
                            >
                                <span>Manage group</span>
                            </b-button>
                        </b-button-group>
                        <b-collapse
                            id="accordion-actions-group"
                            style="display: block"
                            accordion="my-accordion-side-actions"
                            role="tabpanel"
                            class="ml-3"
                        >
                            <b-row no-gutters>
                                <b-button-group>
                                    <b-button
                                        v-if="!float"
                                        :disabled="
                                            params.mode !== 'manageGroup'
                                        "
                                        class="m-1"
                                        size="sm"
                                        @click="saveGroup()"
                                        >save Group</b-button
                                    >

                                    <b-button
                                        v-if="!float"
                                        size="sm"
                                        class="m-1"
                                        :disabled="
                                            params.mode !== 'manageGroup'
                                        "
                                        @click="cancelGroup()"
                                        >cancel</b-button
                                    >
                                </b-button-group>
                            </b-row>
                        </b-collapse>
                        </div>
            </section>
        </b-col>
        <b-col>
            <section  class="mt-1" v-if="!float">
                <b-button-group
                    size="sm"
                    :class="[float ? 'btn-menu' : '', 'mb-1']"
                >
                    <b-button
                        class="mr-2"
                        :disabled="
                            !(selectedArtefacts && selectedArtefacts.length)
                        "
                        @click="setZIndex(1)"
                    >
                        <span>top</span>
                    </b-button>
                    <b-button
                        :disabled="
                            !(selectedArtefacts && selectedArtefacts.length)
                        "
                        @click="setZIndex(-1)"
                    >
                        <span>down</span>
                    </b-button>
                </b-button-group>
            </section>
        </b-col>
    </div>
</template>

<!-- <script src="https://unpkg.com/vue-toasted"></script>-->
<script lang="ts">
import { Component, Prop, Vue, Emit } from 'vue-property-decorator';
import { Artefact } from '@/models/artefact';
import { ScrollEditorParams, ScrollEditorMode } from '../artefact-editor/types';
import {
    ScrollEditorOperation,
    ArtefactPlacementOperationType,
    ArtefactPlacementOperation,
    GroupPlacementOperation,
} from './operations';
import { Placement } from '@/utils/Placement';
import { Point } from '../../utils/helpers';
import { ScrollEditorState } from '../../state/scroll-editor';

@Component({
    name: 'artefact-toolbox',
    components: {},
})
export default class ArtefactToolbox extends Vue {
    @Prop({
        default: -1,
    })
    public artefactId!: number;

    @Prop({ default: false })
    public float!: boolean;

    @Prop({ default: true })

    public keyboardInput!: boolean;
    private reset!: number;
    private zoomDelta!: number;
    
    public mounted() {
        if (this.keyboardInput) {
            window.addEventListener('keydown', this.onKeyPress);
        }
    }

    private get scrollEditorState(): ScrollEditorState {
        return this.$state.scrollEditor;
    }

    private get params(): ScrollEditorParams {
        return this.scrollEditorState.params || new ScrollEditorParams();
    }
    private get edition() {
        return this.$state.editions.current! || {};
    }

    private get mode(): ScrollEditorMode {
        return this.params!.mode;
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

    private get selectedArtefacts() {
        return this.scrollEditorState.selectedArtefacts;
    }

    public destroyed() {
        if (this.keyboardInput) {
            window.removeEventListener('keydown', this.onKeyPress);
        }
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

    private setZIndex(zIndexDirection: number) {
        const operations: ScrollEditorOperation[] = [];
        let operation: ScrollEditorOperation = {} as ScrollEditorOperation;
        const placedArtefacts = this.$state.artefacts.items.filter(
            (x) => x.isPlaced
        );
        const artefactsZOrders = placedArtefacts.map((x) => x.placement.zIndex);
        const zIndex =
            zIndexDirection < 0
                ? Math.min(...artefactsZOrders) - 1
                : Math.max(...artefactsZOrders) + 1;
        if (this.selectedArtefact) {
            const trans = this.selectedArtefact.placement.clone();
            trans.zIndex = zIndex;
            operation = this.createOperation(
                'z-index',
                trans,
                this.selectedArtefact
            );
        }
        if (this.selectedGroup) {
            this.selectedArtefacts.forEach((art) => {
                const trans = art.placement.clone();
                trans.zIndex = zIndex;
                operations.push(this.createOperation('z-index', trans, art));
            });
            operation = new GroupPlacementOperation(
                this.selectedGroup.groupId,
                operations
            );
        }
        this.newOperation(operation);
    }

    private createOperation(
        opType: ArtefactPlacementOperationType,
        newPlacement: Placement,
        artefact: Artefact,
        newIsPlaced: boolean = true
    ): ArtefactPlacementOperation {
        const op = new ArtefactPlacementOperation(
            artefact.id,
            opType,
            artefact.placement,
            newPlacement,
            artefact.isPlaced,
            newIsPlaced
        );
        artefact.placement = newPlacement;
        return op;
    }
    private setMode(mode: ScrollEditorMode) {
        this.params.mode = mode;
    }

    private onKeyPress(event: KeyboardEvent) {
        if (this.artefact) {
            return;
        }

        console.log(event);
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
    @Emit()
    private saveGroup() {
        return true;
    }
    @Emit()
    private manageGroup() {
        return true;
    }
    @Emit()
    private newOperation(op: ScrollEditorOperation) {
        return op;
    }
    @Emit()
    private cancelGroup() {
        return true;
    }
}
</script>

<style lang="scss" scoped>
.btn-xs {
    padding: 0.1rem 0.15rem;
    font-size: 0.75rem;
    line-height: 1;
    border-radius: 0.2rem;
}
.card-body-cancel {
    padding: 0rem !important;
}
.center-btn{
    margin-bottom: 8px;
}
</style>
