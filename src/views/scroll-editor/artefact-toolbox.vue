<template>
    <div :class="{'mt-2': !float}">
        <b-button-group size="sm" :class="[float ? 'btn-menu': '' ,'mb-1']">
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
        <b-button-group size="sm" :class="[float ? 'btn-menu': '' ,'mb-1']">
            <b-button :disabled="!artefact" @click="setZIndex(1)" v-if="!float">
                <span v-if="!float">top</span>
            </b-button>
            <b-button :disabled="!artefact" @click="setZIndex(-1)" v-if="!float">
                <span v-if="!float">down</span>
            </b-button>
        </b-button-group>
        <b-row v-if="mode === 'move'" no-gutters align-v="end">
            <div>
                <table>
                    <tr>
                        <td></td>
                        <td>
                            <b-button
                                :class="[float ? 'btn-xs' : '', 'mt-2']"
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
                                :class="[float ? 'btn-xs' : '', 'mb-2']"
                                size="sm"
                                :disabled="!artefact"
                                @click="dragArtefact(-1,0)"
                            >
                                <i class="fa fa-arrow-left"></i>
                            </b-button>
                        </td>
                        <td>
                            <b-button
                                :class="[float ? 'btn-xs' : '', 'mb-2']"
                                size="sm"
                                :disabled="!artefact"
                                @click="dragArtefact(0,1)"
                            >
                                <i class="fa fa-arrow-down"></i>
                            </b-button>
                        </td>
                        <td>
                            <b-button
                                :class="[float ? 'btn-xs' : '', 'mb-2']"
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
                <b-form-input id="input-small" size="sm" type="number" v-model="params.move"></b-form-input>
            </b-col>
        </b-row>
        <b-row v-if="mode === 'scale'" no-gutters align-v="end">
            <b-button-group>
                <b-button
                    :class="[float ? 'btn-xs' : '',  'm-1']"
                    size="sm"
                    @click="zoomArtefact(1)"
                >
                    <i class="fa fa-plus"></i>
                </b-button>
                <b-button
                    :class="[float ? 'btn-xs' : '', 'm-1']"
                    size="sm"
                    @click="zoomArtefact(-1)"
                >
                    <i class="fa fa-minus"></i>
                </b-button>
            </b-button-group>
            <b-col cols="4" class="mb-1">
                <b-form-input id="input-small" size="sm" type="number" v-model="params.scale"></b-form-input>
            </b-col>
        </b-row>
        <b-row v-if="mode === 'rotate'" no-gutters align-v="end">
            <b-button-group>
                <b-button
                    :class="[float ? 'btn-xs' : '', 'm-1']"
                    size="sm"
                    @click="rotateArtefact(-1)"
                >
                    <font-awesome-icon icon="undo"></font-awesome-icon>
                </b-button>
                <b-button
                    :class="[float ? 'btn-xs' : '', 'm-1']"
                    size="sm"
                    @click="rotateArtefact(1)"
                >
                    <font-awesome-icon icon="redo"></font-awesome-icon>
                </b-button>
                <!-- <b-button class="m-2" @click="resetRotationArtefact()">Reset</b-button> -->
            </b-button-group>
            <b-col cols="4" class="mb-1">
                <b-form-input id="input-small" size="sm" type="number" v-model="params.rotate"></b-form-input>
            </b-col>
        </b-row>
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
import { TransformationDTO } from '../../dtos/sqe-dtos';
import {
    ScrollEditorOperation,
    ScrollEditorOperationType,
    TransformOperation
} from './operations';
import { Transformation } from '@/utils/Mask';

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

    private reset!: number;
    // private mode!: ScrollEditorParams ;
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

    public destroyed() {
        if (this.keyboardInput) {
            window.removeEventListener('keydown', this.onKeyPress);
        }
    }

    public dragArtefact(dirX: number, dirY: number) {
        const trans = this.artefact!.mask.transformation.clone();
        const jump = parseInt(this.params.move.toString());
        trans.translate.x += jump * dirX;
        trans.translate.y += jump * dirY;
        this.setTransformation('translate', trans);
    }

    public rotateArtefact(direction: number) {
        const trans = this.artefact!.mask.transformation.clone();
        if (!trans.rotate) {
            trans.rotate = 0;
        }
        const deltaAngle = direction * this.params.rotate;
        const oldAngle = trans.rotate!;
        const newAngle = oldAngle + deltaAngle;
        const normalizedAngle = ((newAngle % 360) + 360) % 360;
        trans.rotate = normalizedAngle;

        this.setTransformation('rotate', trans);
    }

    public zoomArtefact(direction: number) {
        const trans = this.artefact!.mask.transformation.clone();
        const zoomDelta = (direction * this.params.scale) / 100;
        if (!trans.scale) {
            trans.scale = 1;
        }
        trans.scale += zoomDelta;
        trans.scale = +trans.scale.toFixed(4);
        this.setTransformation('scale', trans);
    }

    public resetRotationArtefact() {
        const trans = this.artefact!.mask.transformation.clone();
        trans.rotate = 0;
        this.setTransformation('rotate', trans);
    }

    public resetScaleArtefact() {
        const trans = this.artefact!.mask.transformation.clone();
        trans.scale = 1;
        this.setTransformation('scale', trans);
    }

    private setZIndex(zIndexDirection: number) {
        const placedArtefacts = this.$state.artefacts.items.filter(
            x => x.isPlaced
        );
        const artefactsZOrders = placedArtefacts.map(
            x => x.mask.transformation.zIndex
        );

        const zIndex =
            zIndexDirection < 0
                ? Math.min(...artefactsZOrders) - 1
                : Math.max(...artefactsZOrders) + 1;

        const trans = this.artefact!.mask.transformation.clone();
        trans.zIndex = zIndex;

        this.setTransformation('z-index', trans);
    }

    private setTransformation(
        opType: ScrollEditorOperationType,
        newTrans: Transformation
    ) {
        const op = new TransformOperation(
            this.artefact!.id,
            opType,
            this.artefact!.mask.transformation,
            newTrans
        );
        this.artefact!.mask.transformation = newTrans;
        this.newOperation(op);
    }

    private setMode(mode: ScrollEditorMode) {
        this.params.mode = mode;
    }

    private onKeyPress(event: KeyboardEvent) {
        if (!this.artefact) {
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
                    this.rotateArtefact(-1);
                    event.preventDefault();
                }
                break;
            case 'ArrowRight':
                if (this.mode === 'move') {
                    this.dragArtefact(1, 0);
                    event.preventDefault();
                } else if (this.mode === 'rotate') {
                    this.rotateArtefact(1);
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
    private newOperation(op: ScrollEditorOperation) {
        return op;
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
</style>
