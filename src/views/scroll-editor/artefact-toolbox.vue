<template>
    <div :class="{'mt-2': !float}">
        <section class="mb-2">
            <b-card no-body class="mb-1">
                <b-card-header header-tag="header" class="p-1" role="tab">
                    <b-button-group size="sm" class="m-1">
                        <b-button
                            :pill="float"
                            :disabled="!artefact"
                            :pressed="mode === 'move'"
                            @click="setMode('move')"
                        >
                            <span v-if="!float">
                                <u>M</u>ove
                            </span>
                            <font-awesome-icon v-if="float" icon="arrows-alt" size="xs"></font-awesome-icon>
                        </b-button>
                        <b-button
                            :pill="float"
                            :disabled="!artefact"
                            :pressed="mode === 'scale'"
                            @click="setMode('scale')"
                        >
                            <span v-if="!float">
                                <u>S</u>cale
                            </span>
                            <font-awesome-icon v-if="float" icon="search" size="xs"></font-awesome-icon>
                        </b-button>
                        <b-button
                            :pill="float"
                            :disabled="!artefact"
                            :pressed="mode === 'rotate'"
                            @click="setMode('rotate')"
                        >
                            <span v-if="!float">
                                <u>R</u>otate
                            </span>
                            <font-awesome-icon v-if="float" icon="sync" size="xs"></font-awesome-icon>
                        </b-button>
                    </b-button-group>
                </b-card-header>
                <b-collapse
                    id="accordion-actions"
                    style="display:block;"
                    accordion="my-accordion-side-actions"
                    role="tabpanel"
                >
                    <b-card-body class="card-body-cancel">
                        <section class="center-btn">
                            <b-row v-if="mode === 'move'" no-gutters align-v="end">
                                <div>
                                    <table>
                                        <tr>
                                            <td></td>
                                            <td>
                                                <b-button
                                                    :class="[float ? 'btn-xs' : 'btn-xs', 'mt-1']"
                                                    size="sm"
                                                    :disabled="!artefact"
                                                    @click="dragArtefact(0,-1)"
                                                >
                                                    <i class="fa fa-arrow-up"></i>
                                                </b-button>
                                            </td>
                                            <td></td>
                                        </tr>
                                        <tr>
                                            <td>
                                                <b-button
                                                    :class="[float ? 'btn-xs' : 'btn-xs', ' ml-2 mb-2']"
                                                    size="sm"
                                                    :disabled="!artefact"
                                                    @click="dragArtefact(-1,0)"
                                                >
                                                    <i class="fa fa-arrow-left"></i>
                                                </b-button>
                                            </td>
                                            <td>
                                                <b-button
                                                    :class="[float ? 'btn-xs' : 'btn-xs', 'mb-2']"
                                                    size="sm"
                                                    :disabled="!artefact"
                                                    @click="dragArtefact(0,1)"
                                                >
                                                    <i class="fa fa-arrow-down"></i>
                                                </b-button>
                                            </td>
                                            <td>
                                                <b-button
                                                    :class="[float ? 'btn-xs' : 'btn-xs', 'mb-2']"
                                                    size="sm"
                                                    :disabled="!artefact"
                                                    @click="dragArtefact(1,0)"
                                                >
                                                    <i class="fa fa-arrow-right"></i>
                                                </b-button>
                                            </td>
                                        </tr>
                                    </table>
                                </div>
                                <b-col cols="4" class="mb-2">
                                    <b-form-input
                                        id="input-small"
                                        size="sm"
                                        type="number"
                                        v-model="params.move"
                                    ></b-form-input>
                                </b-col>
                            </b-row>
                            <b-row v-if="mode === 'scale'" no-gutters align-v="end">
                                <b-button-group>
                                    <b-button
                                        :class="[float ? 'btn-xs' : 'btn-xs',  'ml-2 mb-2']"
                                        size="sm"
                                        @click="zoomArtefact(1)"
                                    >
                                        <i class="fa fa-plus"></i>
                                    </b-button>
                                    <b-button
                                        :class="[float ? 'btn-xs' : 'btn-xs', 'ml-2 mb-2']"
                                        size="sm"
                                        @click="zoomArtefact(-1)"
                                    >
                                        <i class="fa fa-minus"></i>
                                    </b-button>
                                    <b-button
                                        :class="[float ? 'btn-xs' : 'btn-xs', 'ml-2 mb-2']"
                                        size="sm"
                                        @click="resetZoom()"
                                    >reset</b-button>
                                </b-button-group>
                                <b-col cols="4" class="mb-1 mt-3 ml-2">
                                    <b-form-input
                                        id="input-small"
                                        size="sm"
                                        type="number"
                                        v-model="params.scale"
                                    ></b-form-input>
                                </b-col>%
                            </b-row>
                            <b-row v-if="mode === 'rotate'" no-gutters align-v="end">
                                <b-button-group>
                                    <b-button
                                        :class="[float ? 'btn-xs' : 'btn-xs', 'ml-2 mb-2']"
                                        size="sm"
                                        @click="rotateGroupArtefact(-1)"
                                    >
                                        <font-awesome-icon icon="undo"></font-awesome-icon>
                                    </b-button>
                                    <b-button
                                        :class="[float ? 'btn-xs' : 'btn-xs', 'ml-2 mb-2']"
                                        size="sm"
                                        @click="rotateGroupArtefact(1)"
                                    >
                                        <font-awesome-icon icon="redo"></font-awesome-icon>
                                    </b-button>
                                    <!-- <b-button class="m-2" @click="resetRotationArtefact()">Reset</b-button> -->
                                </b-button-group>
                                <b-col cols="4" class="mb-1 mt-3 ml-2">
                                    <b-form-input
                                        id="input-small"
                                        size="sm"
                                        type="number"
                                        v-model="params.rotate"
                                    ></b-form-input>
                                </b-col>
                            </b-row>
                        </section>
                    </b-card-body>
                </b-collapse>
            </b-card>
        </section>
        <section v-if="!float" class="mb-2">
            <b-card no-body>
                <b-card-header header-tag="header" class="p-1" role="tab">
                    <b-button-group size="sm" class="mb-1">
                        <b-button
                            :pill="float"
                            :disabled="!artefact && selectedGroup.artefactIds.length === 0"
                            :pressed="mode === 'manageGroup'"
                            @click="setMode('manageGroup')"
                        >
                            <span>Manage group</span>
                            <font-awesome-icon v-if="float" size="xs"></font-awesome-icon>
                        </b-button>
                    </b-button-group>
                </b-card-header>
                <b-collapse
                    id="accordion-actions-group"
                    style="display:block;"
                    accordion="my-accordion-side-actions"
                    role="tabpanel"
                >
                    <b-card-body class="card-body-cancel">
                        <section class="center-btn">
                            <b-row no-gutters align-v="end">
                                <b-button-group>
                                    <b-button
                                        v-if="!float"
                                        :disabled=" params.mode !== 'manageGroup'"
                                        class="m-1"
                                        size="sm"
                                        @click="saveGroup()"
                                    >save Group</b-button>

                                    <b-button
                                        v-if="!float"
                                        size="sm"
                                        class="m-1"
                                        :disabled="params.mode !== 'manageGroup'"
                                        @click="cancelGroup()"
                                    >cancel</b-button>
                                </b-button-group>
                            </b-row>
                        </section>
                    </b-card-body>
                </b-collapse>
            </b-card>
        </section>
        <section class="center-btn mb-2" v-if="!float">
            <b-card no-body>
                <b-card-header header-tag="header" class="p-1" role="tab">
                    <b-button-group size="sm" :class="[float ? 'btn-menu': '' ,'mb-1']">
                        <b-button :disabled="!artefact" @click="setZIndex(1)">
                            <span>top</span>
                        </b-button>
                        <b-button :disabled="!artefact" @click="setZIndex(-1)">
                            <span>down</span>
                        </b-button>
                    </b-button-group>
                </b-card-header>
            </b-card>
        </section>
    </div>
</template>

<!-- <script src="https://unpkg.com/vue-toasted"></script>-->
<script lang="ts">
import { Component, Prop, Vue, Emit } from 'vue-property-decorator';
import Waiting from '@/components/misc/Waiting.vue';
import { Artefact } from '@/models/artefact';
import {
    ArtefactEditorParamsChangedArgs,
    ArtefactEditorParams,
    ScrollEditorParams,
    ScrollEditorMode
} from '../artefact-editor/types';
import {
    ScrollEditorOperation,
    ScrollEditorOperationType,
    PlacementOperation,
    GroupPlacementOperations
} from './operations';
import { Placement } from '@/utils/Placement';
import { ArtefactGroup } from '@/models/edition';
import { Point } from '../../utils/helpers';

@Component({
    name: 'artefact-toolbox',
    components: {}
})
export default class ArtefactToolbox extends Vue {
    @Prop({
        default: -1
    })
    public artefactId!: number;

    @Prop({ default: false })
    public float!: boolean;

    @Prop({
        default: new ScrollEditorParams()
    })
    public params!: ScrollEditorParams;

    @Prop({ default: true })
    public keyboardInput!: boolean;
    @Prop()
    private selectedGroup: ArtefactGroup = new ArtefactGroup([]);

    private reset!: number;
    private zoomDelta!: number;
    public mounted() {
        if (this.keyboardInput) {
            window.addEventListener('keydown', this.onKeyPress);
        }
    }

    private get mode(): ScrollEditorMode {
        return this.params!.mode;
    }

    private get artefact(): Artefact | undefined {
        return this.$state.artefacts.find(this.artefactId);
    }

    private get selectedArtefacts(): Artefact[] {
        return this.selectedGroup.artefactIds.map((x: number) => {
            const artefact = this.$state.artefacts.find(x);
            if (!artefact) {
                throw new Error(`Can't find artefact ${x}`);
                return {} as Artefact;
            }
            return artefact;
        });
    }

    public destroyed() {
        if (this.keyboardInput) {
            window.removeEventListener('keydown', this.onKeyPress);
        }
    }

    public dragArtefact(dirX: number, dirY: number) {
        const operations: ScrollEditorOperation[] = [];
        this.selectedArtefacts.forEach(art => {
            const placement = art.placement.clone();
            const jump = parseInt(this.params.move.toString());
            placement!.translate.x! += jump * dirX;
            placement!.translate.y! += jump * dirY;
            operations.push(this.createOperation('translate', placement, art));
        });
        const groupPlacementOperations = new GroupPlacementOperations(
            this.selectedGroup.groupId,
            operations
        );
        this.newOperation(groupPlacementOperations);
    }

    public getGroupCenter(): Point {
        const minX = Math.min(
            ...this.selectedArtefacts.map(art => art.placement.translate.x!)
        );
        const minY = Math.min(
            ...this.selectedArtefacts.map(art => art.placement.translate.y!)
        );
        const maxX = Math.max(
            ...this.selectedArtefacts.map(
                art => art.placement.translate.x! + art.boundingBox.width
            )
        );
        const maxY = Math.max(
            ...this.selectedArtefacts.map(
                art => art.placement.translate.y! + art.boundingBox.height
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
        const groupCenterPoint = this.getGroupCenter();

        const deltaAngleDegrees = direction * this.params.rotate;
        const deltaAngleRadians = deltaAngleDegrees * (Math.PI / 180);

        this.selectedArtefacts.forEach(art => {
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

            operations.push(this.createOperation('rotate', newPlacement, art));
        });
        const groupPlacementOperations = new GroupPlacementOperations(
            this.selectedGroup.groupId,
            operations
        );
        this.newOperation(groupPlacementOperations);
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
            y: art.placement.translate.y! + deltaY
        } as Point;
    }

    public zoomArtefact(direction: number) {
        const operations: ScrollEditorOperation[] = [];
        this.selectedArtefacts.forEach(art => {
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
        const groupPlacementOperations = new GroupPlacementOperations(
            this.selectedGroup.groupId,
            operations
        );
        this.newOperation(groupPlacementOperations);
    }

    public resetZoom() {
        const operations: ScrollEditorOperation[] = [];
        this.selectedArtefacts.forEach(art => {
            const trans = art.placement.clone();
            trans.scale = 1;
            operations.push(this.createOperation('scale', trans, art));
        });
        const groupPlacementOperations = new GroupPlacementOperations(
            this.selectedGroup.groupId,
            operations
        );
        this.newOperation(groupPlacementOperations);
    }

    // public resetRotationArtefact() {
    //     if (this.artefact) {
    //         const placement = this.artefact.placement.clone();
    //         placement.rotate = 0;
    //         this.setPlacement('rotate', placement, this.artefact);
    //     }
    // }

    public resetScaleArtefact() {
        if (this.artefact) {
            const placement = this.artefact.placement.clone();
            placement.scale = 1;
            this.setPlacement('scale', placement, this.artefact);
        }
    }

    private setZIndex(zIndexDirection: number) {
        const operations: ScrollEditorOperation[] = [];
        this.selectedArtefacts.forEach(art => {
            const placedArtefacts = this.$state.artefacts.items.filter(
                x => x.isPlaced
            );
            const artefactsZOrders = placedArtefacts.map(
                x => x.placement.zIndex
            );

            const zIndex =
                zIndexDirection < 0
                    ? Math.min(...artefactsZOrders) - 1
                    : Math.max(...artefactsZOrders) + 1;

            const placement = art.placement.clone();
            placement.zIndex = zIndex;
            operations.push(this.createOperation('z-index', placement, art));
        });
        const groupPlacementOperations = new GroupPlacementOperations(
            this.selectedGroup.groupId,
            operations
        );
        this.newOperation(groupPlacementOperations);
    }

    private createOperation(
        opType: ScrollEditorOperationType,
        newPlacement: Placement,
        artefact: Artefact
    ): PlacementOperation {
        const op = new PlacementOperation(
            artefact.id,
            opType,
            artefact.placement,
            newPlacement
        );
        artefact.placement = newPlacement;
        return op;
    }

    private setPlacement(
        opType: ScrollEditorOperationType,
        newPlacement: Placement,
        artefact: Artefact
    ) {
        const op = this.createOperation(opType, newPlacement, artefact);

        this.newOperation(op);
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
    private newOperation(op: ScrollEditorOperation | GroupPlacementOperations) {
        return op;
    }
    @Emit()
    private cancelGroup() {
        return true;
    }
}
</script>

<style lang="scss" scoped>
.delete {
    color: red;
}
.btn-xs {
    padding: 0.1rem 0.15rem;
    font-size: 0.75rem;
    line-height: 1;
    border-radius: 0.2rem;
}
.btn-menu {
    background: #e3e7ea;
}
.card-body-cancel {
    padding: 0rem !important;
}
</style>
