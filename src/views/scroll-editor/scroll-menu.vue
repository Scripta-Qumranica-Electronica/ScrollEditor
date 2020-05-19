<template>
    <div id="scroll-side-menu" role="tablist">
        <section>
            <b-card no-body class="mb-1">
                <b-card-header header-tag="header" class="p-1">
                    <b-button block href="#" variant="info">{{$t('home.editorParameters')}}</b-button>
                </b-card-header>
                <b-collapse
                    style="display:block;"
                    id="accordion-params"
                    accordion="my-accordion-side"
                >
                    <b-card-body>
                        <section>
                            <div class="row">
                                <div class="col-5">Zoom: {{formatTooltip()}}</div>
                                <div class="col">
                                    <b-form-input
                                        ref="zoomRef"
                                        type="range"
                                        min="0.1"
                                        max="1"
                                        step="0.01"
                                        v-model="zoom"
                                    ></b-form-input>
                                </div>
                            </div>
                        </section>
                    </b-card-body>
                </b-collapse>
            </b-card>
        </section>
        <section>
            <b-card no-body class="mb-1">
                <b-card-header header-tag="header" class="p-1" role="tab">
                    <b-button
                        block
                        href="#"
                        v-b-toggle.accordion-actions
                        variant="info"
                    >{{$t('misc.actions')}}</b-button>
                </b-card-header>
                <b-collapse
                    id="accordion-actions"
                    style="display:block;"
                    accordion="my-accordion-side"
                    role="tabpanel"
                >
                    <b-card-body>
                        <section class="center-btn">
                            <b-button @click="openAddArtefactModal()">{{$t('misc.add')}} artefact</b-button>
                            <div class="mt-2">
                                <b-button-group size="sm">
                                    <b-button
                                        :disabled="!artefact"
                                        :pressed="mode === 'translate'"
                                        @click="setMode('translate')"
                                    >Translate</b-button>
                                    <b-button
                                        :disabled="!artefact"
                                        :pressed="mode === 'scale'"
                                        @click="setMode('scale')"
                                    >Scale</b-button>
                                    <b-button
                                        :disabled="!artefact"
                                        :pressed="mode === 'rotate'"
                                        @click="setMode('rotate')"
                                    >Rotate</b-button>
                                </b-button-group>
                                <div v-if="mode === 'translate'">
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
                                    <input v-model="translateValue" />
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

                                    <input v-model="zoomValue" />
                                </div>
                                <div v-if="mode === 'rotate'">
                                    <b-button-group size="sm">
                                        <b-button class="m-2" @click="rotateArtefact(-1)">
                                            <font-awesome-icon icon="undo"></font-awesome-icon>
                                            {{rotationValue}}°
                                        </b-button>
                                        <b-button class="m-2" @click="rotateArtefact(1)">
                                            <font-awesome-icon icon="redo"></font-awesome-icon>
                                            {{rotationValue}}°
                                        </b-button>
                                        <b-button class="m-2" @click="resetRotationArtefact()">Reset</b-button>
                                    </b-button-group>
                                    <input v-model="rotationValue" />
                                </div>
                            </div>
                        </section>
                    </b-card-body>
                </b-collapse>
            </b-card>
        </section>
        <add-artefact-modal></add-artefact-modal>
    </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import Waiting from '@/components/misc/Waiting.vue';
import { Artefact } from '@/models/artefact';
import AddArtefactModal from './add-artefact-modal.vue';
import {
    ArtefactEditorParams,
    ArtefactEditorParamsChangedArgs
} from '../artefact-editor/types';
import { TransformationDTO } from '@/dtos/sqe-dtos';

@Component({
    name: 'scroll-menu',
    components: {
        Waiting,
        'add-artefact-modal': AddArtefactModal
    }
})
export default class ScrollMenu extends Vue {
    @Prop()
    public artefact: Artefact | undefined = undefined;
    private params: ArtefactEditorParams = new ArtefactEditorParams();
    private translateValue = 5;
    private rotationValue = 45;
    private zoomValue = 5;
    private reset!: number;
    private mode: string = '';

    private get artefactSelect(): Artefact | undefined {
        return this.artefact;
    }

    private get zoom(): any {
        return this.params.zoom;
    }

    private set zoom(val: any) {
        this.params.zoom = parseFloat(val);
        this.notifyChange('zoom', val);
    }

    public formatTooltip(): string {
        return (this.zoom * 100).toFixed(0) + '%';
    }
    public openAddArtefactModal() {
        this.$root.$emit('bv::show::modal', 'addArtefactModal');
    }
    public notifyChange(paramName: string, paramValue: any) {
        const args = {
            property: paramName,
            value: paramValue,
            params: this.params
        } as ArtefactEditorParamsChangedArgs;
        this.$emit('paramsChanged', args);
    }

    public mounted() {
        window.addEventListener('keydown', this.onKeyPress);

        this.zoom = 0.1;
    }

    public destroyed() {
        window.removeEventListener('keydown', this.onKeyPress);
    }

    public dragArtefact(translateX: number, translateY: number) {
        this.artefact!.mask.transformation.translate.x +=
            this.translateValue * translateX;
        this.artefact!.mask.transformation.translate.y +=
            this.translateValue * translateY;
    }
    public rotateArtefact(rotate: number) {
        this.artefact!.mask.transformation.rotate! +=
            rotate * this.rotationValue;
    }
    public zoomArtefact(zoom: number) {
        this.artefact!.mask.transformation.scale! +=
            (zoom * this.zoomValue) / 100;
    }
    public resetRotationArtefact() {
        this.artefact!.mask.transformation.rotate = 0;
    }
    public resetScaleArtefact() {
        this.artefact!.mask.transformation.scale = 1;
    }

    private setMode(mode: string) {
        this.mode = mode;
    }

    private onKeyPress(event: KeyboardEvent) {
        if (!this.artefact) {
            return;
        }

        console.log(event);
        switch (event.key) {
            case 'm':
                this.setMode('translate');
                break;
            case 'r':
                this.setMode('rotate');
                break;
            case 's':
                this.setMode('scale');
                break;
            case 'ArrowLeft':
                if (this.mode === 'translate') {
                    this.dragArtefact(-1, 0);
                }
                break;
            case 'ArrowRight':
                if (this.mode === 'translate') {
                    this.dragArtefact(1, 0);
                }
                break;
            case 'ArrowUp':
                if (this.mode === 'translate') {
                    this.dragArtefact(0, -1);
                }
                break;
            case 'ArrowDown':
                if (this.mode === 'translate') {
                    this.dragArtefact(0, 1);
                }
                break;
        }
    }
}
</script>

<style lang="scss" scoped>
#scroll-side-menu {
    touch-action: pan-y;
    top: 0;
    right: 0;
}
</style>
