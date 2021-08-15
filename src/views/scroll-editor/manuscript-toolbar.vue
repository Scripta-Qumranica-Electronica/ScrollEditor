<template>

     <b-container no-gutters class="ml-0 mr-0 pl-0 pr-0">
        <!-- <b-row class="ml-3 mb-3"> -->

        <b-row class="m-0 mb-2 ml-1 pl-0 pr-0" v-if="edition.metrics">
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

        <b-row class="m-0 mb-2 ml-1 pl-0 pr-0" v-if="scrollEditorState.viewport">
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

        <b-row class="m-0 mb-0 ml-1 pl-0 pr-0">
             <b-col cols="12" md="auto"  class="col-lg-6 no-gutters">
                <span><b>Position:</b></span>
            </b-col>
            <b-col cols="12" md="auto" lg="auto" class="no-gutters">
                X: {{ pointerPositionX }}, Y:
                {{ pointerPositionY }}
            </b-col>
        </b-row>


    <b-container fluid class="operations-bar mt-3 mb-3 pb-2">
<!--
        <b-row no-gutters class="btn-tf m-1 mt-0 mb-0 p-1 col-12">

             <b-col class="col-12 ">
                <b-form-checkbox
                    switch
                    size="sm"
                    @input="onTextMode($event)"
                    >Material Mode / Text Mode
                </b-form-checkbox>
            </b-col>
        </b-row> -->

        <b-row no-gutters class="btn-tf m-1 ml-3 mt-0 mb-0 p-1 col-12">
            <b-col class="col-12 ">
                <b-form-checkbox
                    switch
                    size="sm"
                    @input="onDisplayROIs($event)"
                    >Display ROIs
                </b-form-checkbox>
            </b-col>
        </b-row>

        <b-row no-gutters class="btn-tf m-1 ml-3 mt-0 mb-0 p-1 col-12 ">
            <b-col class="col-12 ">
                <b-form-checkbox
                    switch
                    size="sm"

                    @input="
                        onDisplayReconstructedText($event)
                    "
                    >Display Reconstructed Text
                </b-form-checkbox>
            </b-col>
        </b-row>


         <b-row no-gutters class="btn-tf m-1 ml-3 mt-0 mb-0 p-1 col-12 ">
            <b-col class="col-12 ">
                <b-form-checkbox
                    switch
                    size="sm"
                    v-model ="isDisplayText"
                    @input="onDisplayText($event)"
                    >Display Text
                </b-form-checkbox>
            </b-col>
        </b-row>

        <hr class="solid">

         <b-row no-gutters class="btn-tf m-1 mt-0 mb-0 p-1 col-12 ">

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

        <b-row no-gutters class="m-0 p-0 border-right add-cut-side ">

            <b-col no-gutters cols="12" md="auto" lg="auto"
                   class="col-xl-8 col-lg-10 col-md-12 col-sm-12 m-0 mb-2 ">

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

        <b-row>

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

         <hr class="solid" >

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



    </b-container>
    </b-container>

</template>

<script lang="ts">
import { Component, Prop, Emit, Model, Vue } from 'vue-property-decorator';
import { ScrollEditorState } from '@/state/scroll-editor';
import { EditionManuscriptMetricsDTO } from '@/dtos/sqe-dtos';
import { ScrollEditorParams, ScrollEditorOpMode } from '../artefact-editor/types';
import { Placement } from '@/utils/Placement';
import { Artefact } from '@/models/artefact';
import { Point } from '../../utils/helpers';
import {
    ArtefactPlacementOperation,
    ArtefactPlacementOperationType,
    // EditGroupOperation,
    EditionMetricOperation,
    GroupPlacementOperation,
    ScrollEditorOperation,
} from './operations';

@Component({
    name: 'manuscript-toolbar',
    components: {
    },
})

export default class ManuscriptToolbar extends Vue {

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

    private onDisplayROIs(value: boolean) {
        this.scrollEditorState.displayRois = value;
    }
    private onDisplayReconstructedText(value: boolean) {
        this.scrollEditorState.displayReconstructedText = value;
    }

    private get isDisplayText(): boolean {
        return this.scrollEditorState.displayText;
    }
    private onDisplayText(value: boolean) {
        this.scrollEditorState.displayText = value;
    }


    public get selectedGroup() {
        return this.scrollEditorState.selectedGroup;
    }

    private openAddArtefactModal() {
        this.$root.$emit('bv::show::modal', 'addArtefactModal');
    }


    private removeArtefactOrGroup() {
        if (this.selectedArtefact) {
            const operation = this.createOperation(
                'delete',
                Placement.empty,
                this.selectedArtefact,
                false
            );

            console.debug('removeArtefactOrGroup creating new operation ', operation);
            this.newOperation(operation);
        }

        if (this.selectedGroup) {
            const operations: ScrollEditorOperation[] = [];

            this.selectedArtefacts.forEach((art: Artefact) => {
                operations.push(
                    this.createOperation('delete', Placement.empty, art, false)
                );
            });

            const operation = new GroupPlacementOperation(
                this.selectedGroup.groupId,
                operations,
                'delete'
            );

            this.newOperation(operation);
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



    private get mode(): ScrollEditorOpMode {
        return this.params!.mode;
    }

    private setMode(mode: ScrollEditorOpMode) {
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


.card-body-cancel {
    padding: 0rem !important;
}


</style>