<template>

     <b-container no-gutters class="side-toolbar ml-0 mr-0 pl-0 pr-0">
        <!-- <b-row class="ml-3 mb-3"> -->

        <b-row class="m-0 mb-3 ml-1 pl-0 pr-0">
            <b-col cols="12" md="auto"  class="col-lg-6  no-gutters">
                <span
                    ><b>{{ $t('home.editionSize') }}:</b></span
                >
            </b-col>
             <b-col cols="12" md="auto" lg="auto" class="no-gutters">
                {{ edition.metrics.width }} mm X
                {{ edition.metrics.height }} mm
            </b-col>
        </b-row>

        <b-row class="m-0 mb-3 ml-1 pl-0 pr-0">
             <b-col cols="12" md="auto"  class="col-xl-6 col-lg-7 no-gutters">
                <span
                    ><b>{{ $t('home.viewPortSize') }}:</b></span
                >
            </b-col>
             <b-col cols="12" md="auto" lg="auto" class="no-gutters">
                {{ viewportSizeWidth }} mm X
                {{ viewportSizeHeight }} mm
            </b-col>
        </b-row>

        <b-row class="m-0 mb-3 ml-1 pl-0 pr-0">
             <b-col cols="12" md="auto"  class="col-lg-6 no-gutters">
                <span><b>Position:</b></span>
            </b-col>
            <b-col cols="12" md="auto" lg="auto" class="no-gutters">
                X: {{ pointerPositionX }}, Y:
                {{ pointerPositionY }}
            </b-col>
        </b-row>


         <b-row no-gutters class="btn-tf m-1 p-1 col-12">

                <b-col sm md="auto" lg="auto" class="m-0 mt-1 p-2">
                    <b-button
                        size="sm"
                        class="btn-add m-0 mr-1 p-1"
                        @click="openAddArtefactModal()"
                        >{{ $t('misc.add') }} artefact</b-button
                    >
                </b-col>

                <b-col cols="12" md="auto" lg="auto" class="m-0 mt-md-1 p-2 col-sm-12">
                    <b-button
                        class="btn-remove m-0 p-1"
                        size="sm"
                        @click="removeArtefactOrGroup()"
                        >{{ $t('misc.remove') }}</b-button
                    >
                </b-col>

        </b-row>

        <hr class="solid">

        <b-row no-gutters class="m-0 p-0 border-right add-cut-side">

            <b-col no-gutters cols="12" md="auto" lg="auto"
                   class="col-xl-8 col-lg-10 col-md-12 col-sm-12 m-0 mb-2">

                <b-form-row align-v="end" align-h="center">
                    <b-col no-gutters cols="12" md="auto" lg="auto"
                           class="col-xl-5 col-lg-5 col-md-5 col-sm-8 m-0  ">
                        <b-form-select
                            v-model="selectedSide"
                            :options="sidesOptions"
                            size="sm"
                            class="ml-2 mt-2"
                        ></b-form-select>
                    </b-col>

                    <b-col no-gutters cols="9" md="auto" lg="auto"
                           class="col-xl-4 col-lg-4 col-md-4 col-sm-8 m-0">
                        <b-form-input
                            size="sm"
                            class="ml-2 mt-2"
                            min="1"
                            type="number"
                            v-model="metricsInput"
                        ></b-form-input>
                    </b-col>
                    <span align-v="end" class="ml-2 mt-3">mm</span>

                </b-form-row>
            </b-col>

            <b-col no-gutters cols="6" md="auto" lg="auto"
                   class="col-xl-3 col-lg-4 m-0" >

                <b-row no-gutters>
                    <!-- <b-col class=" ml-5"> -->
                    <b-col>
                        <b-button-group>
                            <b-button
                                class="m-1 ml-2"
                                size="sm"
                                @click="resizeScroll(1)"
                                >Add</b-button
                            >
                            <b-button
                                class="m-1 ml-6"
                                size="sm"
                                @click="resizeScroll(-1)"
                                >Cut</b-button
                            >
                        </b-button-group>
                    </b-col>
                </b-row>

            </b-col>

        </b-row>

        <hr class="solid">

        <b-row >

            <b-col class="col-12 ml-0">

                <b-row class="ml-0">
                   <b-col
                      class="col-xl-8 col-lg-8 col-md-10 col-sm-12 col-xs-12 ml-0">
                        <p v-b-toggle.accordion-manage-group  role="tab">
                            <i class="toggle-icon fa fa-angle-down"/>
                            <span class="toggle-icon">Group Actions</span>
                        </p>
                    </b-col>

                    <b-col cols="12">

                        <b-collapse  id="accordion-manage-group" class="mt-2"
                                    accordion="group-accordion" role="tabpanel">

                            <b-row>
                               <b-col  class="m-0"
                                       lg="auto" md="auto" sm="auto">
                                <!-- <b-button-group class="ml-0"> -->
                                    <b-button
                                        class="m-1"
                                        size="sm"
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
                                <!-- </b-button-group> -->
                                </b-col>

                                <b-col class="no-gutters "
                                       lg="auto" md="auto" sm="auto">

                                    <b-row no-gutters>
                                        <b-button-group>
                                            <b-button
                                                :disabled="
                                                    params.mode !== 'manageGroup'
                                                "
                                                class="m-1"
                                                size="sm"
                                                @click="saveGroup()"
                                                >save Group</b-button
                                            >

                                            <b-button
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
                                <!-- </b-collapse> -->
                                </b-col>
                            </b-row>

                        </b-collapse>

                    </b-col>

                </b-row>
            </b-col>
        </b-row>

         <hr class="solid">

        <b-row>

            <b-col class="m-0 ml-4 p-0 pl-2 center-btn">

                <!-- <section  class="mt-1"> -->
                    <b-button-group
                        size="sm"
                        class="m-0"
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
                <!-- </section> -->

            </b-col>

        </b-row>

  <hr class="solid">

        <b-row class="move-artefact-area">
            <b-col>

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
                            <b-button :pill="float" @click="statusMirror()"
                                        :disabled="
                                            !(
                                                selectedArtefacts &&
                                                selectedArtefacts.length
                                            )
                                        "
                            >
                           mirror
                            </b-button>
                        </b-button-group>
                    </b-card-header>
                    <b-collapse
                        id="accordion-pill-actions"
                        style="display: block"
                        accordion="my-accordion-pill-actions"
                        role="tabpanel"
                    >
                        <b-card-body class="card-body-cancel"

                        >
                            <section class="center-btn" >
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
                                            v-model="paramsmove"
                                            :disabled="
                                            !(
                                                selectedArtefacts &&
                                                selectedArtefacts.length
                                            )
                                            "
                                        ></b-form-input>
                                    </b-col>
                                    <b-col no-gutters
                                        :class="[
                                            !(
                                                selectedArtefacts &&
                                                selectedArtefacts.length
                                            )? 'text-muted' : ''
                                            ]"
                                    > mm
                                    </b-col>
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
                                            size="sm"                                                                                                                                  :disabled="
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
                                            :class="[
                                                float ? 'btn-xs' : 'btn-xs',
                                                'ml-1 mb-2',
                                            ]"
                                            size="sm"
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
                                            :class="[
                                                float ? 'btn-xs' : 'btn-xs',
                                                'ml-1 mb-2',
                                            ]"
                                            size="sm"
                                            :disabled="
                                            !(
                                                selectedArtefacts &&
                                                selectedArtefacts.length
                                            )
                                            "
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
                                            :disabled="
                                            !(
                                                selectedArtefacts &&
                                                selectedArtefacts.length
                                            )
                                            "
                                        ></b-form-input> </b-col
                                    >
                                   <b-col no-gutters
                                        :class="[
                                            !(
                                                selectedArtefacts &&
                                                selectedArtefacts.length
                                            )? 'text-muted' : ''
                                            ]"
                                    > %
                                    </b-col>

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
                                            :disabled="
                                            !(
                                                selectedArtefacts &&
                                                selectedArtefacts.length
                                            )
                                            "
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
                                            :disabled="
                                            !(
                                                selectedArtefacts &&
                                                selectedArtefacts.length
                                            )
                                            "
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
                                             :disabled="
                                            !(
                                                selectedArtefacts &&
                                                selectedArtefacts.length
                                            )
                                            "
                                        ></b-form-input> </b-col
                                    >
                                   <b-col no-gutters
                                        :class="[
                                            !(
                                                selectedArtefacts &&
                                                selectedArtefacts.length
                                            )? 'text-muted' : ''
                                            ]"
                                    > degree
                                    </b-col>

                                </b-row>

                            </section>
                        </b-card-body>
                    </b-collapse>

                </b-card>

            </b-col>
        </b-row>

    </b-container>

</template>

<script lang="ts">
import { Component, Prop, Emit, Model, Vue } from 'vue-property-decorator';
import { ScrollEditorState } from '@/state/scroll-editor';
import { EditionManuscriptMetricsDTO } from '@/dtos/sqe-dtos';
import { ScrollEditorParams, ScrollEditorMode } from '../artefact-editor/types';
import { Placement } from '@/utils/Placement';
import { Artefact } from '@/models/artefact';
import { ArtefactGroup } from '../../models/edition';
import { Point } from '../../utils/helpers';
// import ArtefactToolbox from './artefact-toolbox.vue';
import {
    ArtefactPlacementOperation,
    ArtefactPlacementOperationType,
    EditGroupOperation,
    EditionMetricOperation,
    GroupPlacementOperation,
    ScrollEditorOperation,
} from './operations';

@Component({
    name: 'scroll-side-toolbar',
    components: {
        // 'artefact-toolbox': ArtefactToolbox,
    },
})

export default class ScrollSideToolbar extends Vue {

    // @Prop() private params!: ScrollEditorParams;
    @Prop({ default: -1 }) public artefactId!: number;

    private selectedSide: string = 'left';
    private metricsInput: number = 1;

    private sidesOptions: Array<{ text: string; value: string }> = [
        { text: 'Left', value: 'left' },
        { text: 'Right', value: 'right' },
        { text: 'Top', value: 'top' },
        { text: 'Down', value: 'down' },
    ];

    private keyboardInput: boolean = true;
    private float: boolean = true;
    private zoomDelta!: number;

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


    protected mounted() {
        if (this.keyboardInput) {
            window.addEventListener('keydown', this.onKeyPress);
        }
    }

    public destroyed() {
        if (this.keyboardInput) {
            window.removeEventListener('keydown', this.onKeyPress);
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

    private get pointerPositionX() {
        return (
            this.scrollEditorState.pointerPosition.x /
            this.params.zoom /
            this.edition.ppm
        ).toFixed(2);
    }

    private get pointerPositionY() {
        return (
            this.scrollEditorState.pointerPosition.y /
            this.params.zoom /
            this.edition.ppm
        ).toFixed(2);
    }

    private get viewportSizeWidth() {
        return Math.round(
            this.scrollEditorState.viewport!.width / this.edition.ppm
        );
    }
    private get viewportSizeHeight() {
        return Math.round(
            this.scrollEditorState.viewport!.height / this.edition.ppm
        );
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
        console.log('selectedGroup ',  this.scrollEditorState.selectedGroup);
        return this.scrollEditorState.selectedGroup;
    }

    // private selectGroup(group: ArtefactGroup | undefined) {
    //     this.scrollEditorState.selectGroup(group);
    // }

    private openAddArtefactModal() {
        this.$root.$emit('bv::show::modal', 'addArtefactModal');
    }


    private removeArtefactOrGroup() {
        let operation: ScrollEditorOperation = {} as ScrollEditorOperation;

        console.log('removeArtefactOrGroup this.selectedArtefact', this.selectedArtefact);
        console.log('removeArtefactOrGroup this.selectedGroup', this.selectedGroup);

        if (this.selectedArtefact) {
            operation = this.createOperation(
                'delete',
                Placement.empty,
                this.selectedArtefact,
                false
            );
        }
        if (this.selectedGroup) {
            const operations: ScrollEditorOperation[] = [];

            this.selectedArtefacts.forEach((art: Artefact) => {
                operations.push(
                    this.createOperation('delete', Placement.empty, art, false)
                );
            });

            operation = new GroupPlacementOperation(
                this.selectedGroup.groupId,
                operations,
                'delete'
            );
        }

        this.newOperation(operation);

        if (this.selectedGroup) {
            this.deleteGroup(this.selectedGroup.groupId);
        }
    }


    private deleteGroup(groupId: number) {
        const groupArtefact = this.edition.artefactGroups.find(
            (x) => x.groupId === groupId
        );
        if (groupArtefact) {
            groupArtefact.artefactIds = [];
        }
    }



    private get mode(): ScrollEditorMode {
        return this.params!.mode;
    }

    private setMode(mode: ScrollEditorMode) {
        this.params.mode = mode;
    }


    private resizeScroll(direction: number) {
        const newMetrics: EditionManuscriptMetricsDTO = {
            ...this.edition.metrics,
        };

        switch (this.selectedSide) {
            case 'left':
            case 'right':
                newMetrics.width += +this.metricsInput * direction;
                if (this.selectedSide === 'left') {
                    newMetrics.xOrigin += +this.metricsInput * direction * -1;
                }
                break;

            case 'top':
            case 'down':
                newMetrics.height += +this.metricsInput * direction;
                if (this.selectedSide === 'top') {
                    newMetrics.yOrigin += +this.metricsInput * direction * -1;
                }
                break;
        }
        if (
            direction === -1 &&
            !this.allowResizing(this.selectedSide, newMetrics)
        ) {
            this.$toasted.error(
                'Cannot resize scroll because artefacts will be cropped',
                { duration: 3000 }
            );
        } else {
            const metricsOperation = new EditionMetricOperation(
                this.edition.id,
                this.edition.metrics,
                newMetrics
            );
            this.edition.metrics = { ...newMetrics };
            this.newOperation(metricsOperation);
            this.$emit('onMetricsChange');
        }
    }

    private allowResizing(
        side: string,
        newMetrics: EditionManuscriptMetricsDTO
    ): boolean {
        // left : XOrigin <= Xmin
        if (side === 'left') {
            const minX =
                Math.min(
                    ...this.placedArtefacts.map(
                        (art) => art.placement.translate.x!
                    )
                ) / this.edition.ppm;
            return newMetrics.xOrigin <= minX;
        }

        // right : Xmax <= width
        if (side === 'right') {
            const maxX =
                Math.max(
                    ...this.placedArtefacts.map(
                        (art) =>
                            art.placement.translate.x! + art.boundingBox.width
                    )
                ) / this.edition.ppm;
            return maxX - newMetrics.xOrigin <= newMetrics.width;
        }

        // top : YOrigin <= Ymin
        if (side === 'top') {
            const minY =
                Math.min(
                    ...this.placedArtefacts.map(
                        (art) => art.placement.translate.y!
                    )
                ) / this.edition.ppm;
            return newMetrics.yOrigin <= minY;
        }

        // down : Ymax <= height
        if (side === 'down') {
            const maxY =
                Math.max(
                    ...this.placedArtefacts.map(
                        (art) =>
                            art.placement.translate.y! + art.boundingBox.height
                    )
                ) / this.edition.ppm;
            return maxY - newMetrics.yOrigin <= newMetrics.height;
        }

        return true;
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

    public statusMirror() {
        const operations: ArtefactPlacementOperation[] = [];
        let operation: ScrollEditorOperation = {} as ScrollEditorOperation;
        if (this.selectedArtefact) {
            const placement = this.selectedArtefact.placement.clone();
            placement.mirrored = !placement.mirrored;
            operation = this.createOperation(
                'mirror',
                placement,
                this.selectedArtefact
            );
        }
        if (this.selectedGroup) {
            this.selectedArtefacts.forEach((art) => {
                const placement = art.placement.clone();
                placement.mirrored = !placement.mirrored;
                operations.push(
                    this.createOperation('mirror', placement, art)
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



}
</script>

<style lang="scss" scoped>
@import '@/assets/styles/_variables.scss';
@import '@/assets/styles/_fonts.scss';
.center-btn{
    margin-bottom: 8px;
}

hr.solid {
    /* border-top: 2px solid #999; */
    border-top: 1px solid #dee2e6;

}

.toggle-icon {
    margin-left: 5px;
    color: $blue;
}

.btn-xs {
    padding: 0.1rem 0.15rem;
    font-size: 0.75rem;
    line-height: 1;
    border-radius: 0.2rem;
}
</style>