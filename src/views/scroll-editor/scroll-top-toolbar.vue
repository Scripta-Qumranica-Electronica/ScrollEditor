<template>
    <toolbar no-gutters id="scroll-top-toolbar">
        <toolbox subject="Mode">
            <b-button-group>
                <toolbar-icon-button
                    :pressed.sync="inMaterialMode"
                    text-center
                    @click="onTextMode('material')"
                    title="Material"
                    :show-text="true"
                />
                <toolbar-icon-button
                    :pressed.sync="inTextMode"
                    @click="onTextMode('text')"
                    title="Text"
                    :show-text="true" />
            </b-button-group>
        </toolbox>
        <zoom-toolbox
            v-model="localZoom"
            delta="0.05"
            @zoomChanged="onZoomChanged($event)"
            subject="Zoom Manuscript"
        />
        <toolbox subject="Resize Artefact">
            <b-button-group>
                <toolbar-icon-button title="Zoom Out" icon="minus" @click="zoomArtefact(-1)" :disabled="isToolbarDisabled"/>
                <toolbar-icon-button title="Zoom In" icon="plus" @click="zoomArtefact(1)" :disabled="isToolbarDisabled"/>
                <toolbar-icon-button title="Reset" :show-text="true" @click="resetZoom" :disabled="isToolbarDisabled"/>
                <b-input-group prepend="By" append="%">
                    <b-form-input  type="number" class="by-input"
                        v-model="params.scale" :disabled="isToolbarDisabled"
                    />
                </b-input-group>
            </b-button-group>
        </toolbox>

        <toolbox subject="Rotate Artefact">
            <b-button-group>
                <toolbar-icon-button title="Rotate Left" icon="undo" @click="rotateGroupArtefact(-1)" :disabled="isToolbarDisabled"/>
                <toolbar-icon-button title="Rotate Right" icon="redo" @click="rotateGroupArtefact(+1)" :disabled="isToolbarDisabled"/>
                <b-input-group prepend="By" append="degrees">
                    <b-form-input type="number" class="by-input" v-model="params.rotate" :disabled="isToolbarDisabled"/>
                </b-input-group>
                <toolbar-icon-button title="Mirror" :show-text="true" :pressed="isMirroredPressed" @click="mirrorArtefact" :disabled="isToolbarDisabled"/>
            </b-button-group>
        </toolbox>


        <toolbox subject="Move Artefact">
            <b-button-group>
                <toolbar-icon-button title="Up" icon="arrow-up" @click="dragArtefact(0, -1)" :disabled="isToolbarDisabled"/>
                <toolbar-icon-button title="Down" icon="arrow-down" @click="dragArtefact(0, 1)" :disabled="isToolbarDisabled"/>
                <toolbar-icon-button title="Left" icon="arrow-left" @click="dragArtefact(-1, 0)" :disabled="isToolbarDisabled"/>
                <toolbar-icon-button title="Right" icon="arrow-right" @click="dragArtefact(1, 0)" :disabled="isToolbarDisabled"/>
                <b-input-group prepend="By" append="mm">
                    <b-form-input type="number" class="by-input" v-model="params.move" :disabled="isToolbarDisabled"/>
                </b-input-group>
            </b-button-group>
        </toolbox>

        <undo-redo-toolbox />
    </toolbar>
</template>

<script lang="ts">
import { Component, Emit, Model, Prop, Vue } from 'vue-property-decorator';

import { ScrollEditorState } from '@/state/scroll-editor';
import ZoomToolbox from '@/components/toolbars/zoom-toolbox.vue';

import { EditionManuscriptMetricsDTO } from '@/dtos/sqe-dtos';
import {
    ScrollEditorParams,
    ScrollEditorOpMode,
} from '../artefact-editor/types';
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
import RotationToolbox from '@/components/toolbars/rotation-toolbox.vue';
import Toolbox from '@/components/toolbars/toolbox.vue';
import Toolbar from '@/components/toolbars/toolbar.vue';
import ToolbarIconButton from '@/components/toolbars/toolbar-icon-button.vue';
import UndoRedoToolbox from '@/components/toolbars/undo-redo-toolbox.vue';

@Component({
    name: 'scroll-top-toolbar',
    components: {
        'zoom-toolbox': ZoomToolbox,
        'rotation-toolbox': RotationToolbox,
        toolbox: Toolbox,
        toolbar: Toolbar,
        'toolbar-icon-button': ToolbarIconButton,
        'undo-redo-toolbox': UndoRedoToolbox,
    },
})
export default class ScrollTopToolbar extends Vue {
    @Model('zoomChangedGlobal', { type: Number }) private paramsZoom!: number;

    @Emit()
    private newOperation(op: ScrollEditorOperation) {
        return op;
    }

    protected localZoom: number = this.paramsZoom || 0.1;

    protected onZoomChanged(val: number) {
        this.localZoom = val;
        this.$emit('zoomChangedGlobal', val);
    }

    protected get inTextMode(): boolean {
        return 'text' === this.scrollEditorState.mode;
    }

    // Computed properties are by default getter-only,
    // but we also provide a dummy setter to avoid this warning:
    // Computed property "inTextMode" was assigned to but it has no setter
    protected set inTextMode(val: boolean) {
        const param = 1;
    }

    protected get inMaterialMode(): boolean {
        return 'material' === this.scrollEditorState.mode;
    }

    // Computed properties are by default getter-only,
    // but we also provide a dummy setter to avoid this warning:
    // Computed property "inMaterialMode" was assigned to but it has no setter
    protected set inMaterialMode(val: boolean) {
        const param = 1;
    }

    protected get textVariant(): string {
        return 'text' === this.scrollEditorState.mode
            ? 'info'
            : 'outline-secondary';
    }

    protected get materialVariant(): string {
        return 'material' === this.scrollEditorState.mode
            ? 'info'
            : 'outline-secondary';
    }

    protected get mode(): ScrollEditorOpMode {
        return this.params!.mode;
    }

    protected onKeyDown(key: KeyboardEvent) {
        console.debug('scroll-top-toolbar keydown ', key.key);
    }
/*    private onKeyPress(event: KeyboardEvent) {
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
    } */

    private get edition() {
        return this.$state.editions.current! || {};
    }

    private get scrollEditorState(): ScrollEditorState {
        return this.$state.scrollEditor;
    }

    private get params(): ScrollEditorParams {
        return this.scrollEditorState.params || new ScrollEditorParams();
    }

    protected onTextMode(value: ScrollEditorMode) {
        this.scrollEditorState.mode = value;
    }

    private get artefacts() {
        return this.$state.artefacts.items || [];
    }

    private get selectedArtefacts() {
        return this.scrollEditorState.selectedArtefacts;
    }

    protected get isMirroredPressed() {
        return this.selectedArtefacts.every(a => a.placement.mirrored);
    }

    protected get isToolbarDisabled() {
        return !this.selectedArtefacts || !this.selectedArtefacts.length;
    }

    protected get selectedArtefact() {
        return this.scrollEditorState.selectedArtefact;
    }

    protected get selectedGroup() {
        return this.scrollEditorState.selectedGroup;
    }

    public mirrorArtefact() {
        const operations: ArtefactPlacementOperation[] = [];
        let operation: ScrollEditorOperation;

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

        this.newOperation(operation!);  // We know that there is a selection - otherwise the handler is not called
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
        const x = art.placement.translate.x + art.boundingBox.width / 2;
        const y = art.placement.translate.y + art.boundingBox.height / 2;

        return { x, y };
    }

    public dragArtefact(dirX: number, dirY: number) {
        const operations: ScrollEditorOperation[] = [];
        let operation: ScrollEditorOperation = {} as ScrollEditorOperation;
        if (this.selectedArtefact) {
            const placement = this.selectedArtefact.placement.clone();
            const jump =
                parseInt(this.params.move.toString()) * this.edition.ppm;
            placement.translate.x += jump * dirX;
            placement.translate.y += jump * dirY;
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
                placement.translate.x += jump * dirX;
                placement.translate.y += jump * dirY;
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
        let newScale: number;
        const operations: ScrollEditorOperation[] = [];
        let operation: ScrollEditorOperation = {} as ScrollEditorOperation;
        if (this.selectedArtefact) {
            const trans = this.selectedArtefact.placement.clone();
            if (direction === 1) {
                newScale = trans.scale + this.params.scale / 100;
            } else {
                newScale = trans.scale - this.params.scale / 100;
            }
            if (!trans.scale) {
                trans.scale = 1;
            }
            trans.scale = newScale;
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
                    newScale = trans.scale + this.params.scale / 100;
                } else {
                    newScale = trans.scale - this.params.scale / 100;
                }
                if (!trans.scale) {
                    trans.scale = 1;
                }
                trans.scale = newScale;
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

#scroll-top-toolbar {
    display: flex;
}

input.by-input {
    width: 4rem;
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
    box-shadow: rgb(113, 230, 210);
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