<template>
    <div :class="{'mt-2': !float}">
        <b-button-group size="sm">
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
            <b-button
                :pill="float"
                :disabled="!artefact"
                @click="removeArtefat()"
            >
                <span v-if="!float">Delete</span>
                <font-awesome-icon v-if="float" icon="sync" size="xs"></font-awesome-icon>
            </b-button>
        </b-button-group>
        <div v-if="mode === 'move'">
            <table>
                <tr>
                    <td></td>
                    <td>
                        <b-button
                            class="mt-2"
                            size="sm"
                            :disabled="!artefactSelect"
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
                            class="mb-2"
                            size="sm"
                            :disabled="!artefactSelect"
                            @click="dragArtefact(-1,0)"
                        >
                            <i class="fa fa-arrow-left"></i>
                        </b-button>
                    </td>
                    <td>
                        <b-button
                            class="mb-2"
                            size="sm"
                            :disabled="!artefactSelect"
                            @click="dragArtefact(0,1)"
                        >
                            <i class="fa fa-arrow-down"></i>
                        </b-button>
                    </td>
                    <td>
                        <b-button
                            class="mb-2"
                            size="sm"
                            :disabled="!artefactSelect"
                            @click="dragArtefact(1,0)"
                        >
                            <i class="fa fa-arrow-right"></i>
                        </b-button>
                    </td>
                </tr>
            </table>
            <input v-model="params.move" type="number" />
        </div>
        <div v-if="mode === 'scale'">
            <b-button-group size="sm">
                <b-button class="m-2" @click="zoomArtefact(1)">
                    <i class="fa fa-plus"></i>
                </b-button>
                <b-button class="m-2" @click="zoomArtefact(-1)">
                    <i class="fa fa-minus"></i>
                </b-button>
                <b-button class="m-2" @click="resetScaleArtefact()">Reset</b-button>
            </b-button-group>

            <input v-model="params.scale" type="number" />
        </div>
        <div v-if="mode === 'rotate'">
            <b-button-group size="sm">
                <b-button class="m-2" @click="rotateArtefact(-1)">
                    <font-awesome-icon icon="undo"></font-awesome-icon>
                    {{params.rotate}}°
                </b-button>
                <b-button class="m-2" @click="rotateArtefact(1)">
                    <font-awesome-icon icon="redo"></font-awesome-icon>
                    {{params.rotate}}°
                </b-button>
                <b-button class="m-2" @click="resetRotationArtefact()">Reset</b-button>
            </b-button-group>
            <input v-model="params.rotate" type="number" />
        </div>
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

@Component({
    name: 'artefact-toolsbox',
    components: {}
})
export default class ArtefactToolsbox extends Vue {
    @Prop({
        default: undefined
    })
    public artefact: Artefact | undefined;
    @Prop({ default: false })
    public float!: boolean;
    @Prop(
        {
            default: new ScrollEditorParams()
        }
    )
    public params!: ScrollEditorParams;

    private reset!: number;
    // private mode!: ScrollEditorParams ;
    public mounted() {
        window.addEventListener('keydown', this.onKeyPress);
    }

    private get mode(): ScrollEditorMode {
        return this.params!.mode;
    }

    private get artefactSelect(): Artefact | undefined {
        return this.artefact;
    }

    public destroyed() {
        window.removeEventListener('keydown', this.onKeyPress);
    }

    public dragArtefact(dirX: number, dirY: number) {
        const jump = parseInt(this.params.move.toString());
        this.artefact!.mask.transformation.translate.x += jump * dirX;
        this.artefact!.mask.transformation.translate.y += jump * dirY;
    }
    public removeArtefat() {
        this.artefact!.mask.transformation = {} as TransformationDTO;
        this.artefact = undefined;
    }
    public rotateArtefact(direction: number) {
        const deltaAngle = direction * this.params.rotate;
        const oldAngle = this.artefact!.mask.transformation.rotate!;
        const newAngle = oldAngle + deltaAngle;
        const normalizedAngle = ((newAngle % 360) + 360) % 360;

        this.artefact!.mask.transformation.rotate = normalizedAngle;
    }
    public zoomArtefact(direction: number) {
        const zoomDelta = (direction * this.params.scale) / 100;
        this.artefact!.mask.transformation.scale! += zoomDelta;
    }
    public resetRotationArtefact() {
        this.artefact!.mask.transformation.rotate = 0;
    }
    public resetScaleArtefact() {
        this.artefact!.mask.transformation.scale = 1;
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
}
</script>

<style lang="scss" scoped>
</style>
