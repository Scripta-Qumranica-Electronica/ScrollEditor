<template>
    <div id="artefact-toolbar">
        <b-col class="p-3">
            <div>
                <b-row align-v="center">
                    <!-- <b-col class="col-3 col-md-4 col-sm-5 col-xs-5 position-zoom"> -->
                    <b-col class="col-lg-3 col-xl-2 position-zoom">
                        <zoom-toolbox
                            v-model="params.zoom"
                            delta="0.05"
                            @zoomChanged="onZoomChanged($event)"
                        />
                    </b-col>
                    <b-col class="p-0 col-lg-3 col-xl-2">
                        <b-button
                            id="popover-adjust"
                            variant="outline-secondary"
                            ><img
                                class="mr-1"
                                src="@/assets/images/adjust.svg"
                            />
                            <span>Adjust image</span>
                        </b-button>
                        <b-popover
                            class="popover-body"
                            target="popover-adjust"
                            triggers="click"
                            placement="bottom"
                            container="my-container"
                            ref="popover"
                        >
                            <div>
                                <image-settings
                                    :imageStack="
                                        imagedObject.getImageStack(
                                            artefact.side
                                        )
                                    "
                                    id="popover-input-1"
                                    :params="params"
                                    @image-setting-changed="
                                        onImageSettingChanged($event)
                                    "
                                />
                            </div>
                        </b-popover>
                    </b-col>
                    <!-- <b-col class="p-0 col-3 col-md-4 col-sm-5 col-xs-5 position-rotate"> -->
                    <b-col class="p-0 col-lg-2 position-rotate">
                        <rotation-toolbox
                                v-model="params.rotationAngle"
                                delta="90"
                                :enable-text="false"
                                @rotationAngleChanged="onRotationAngleChanged($event)"
                        />
                    </b-col>
                    <b-col class="col-lg-4 col-xl-5">
                        <b-row align-v="center">
                            <div class="mr-3" v-if="artefact && artefact.mask">
                                <b-form-checkbox v-model="background"
                                    >Background</b-form-checkbox
                                >
                            </div>
                            <div class="mr-3">
                                <b-form-checkbox v-model="highLight"
                                    >HighLight</b-form-checkbox
                                >
                            </div>
                            <div>
                                <b-dropdown
                                    :text="sideFilter.displayName"
                                    class="btn-sm"
                                >
                                    <b-dropdown-item
                                        v-for="filter in sideOptions"
                                        :key="filter.displayName"
                                        @click="sideFilterChanged(filter)"
                                        >{{
                                            filter.displayName
                                        }}</b-dropdown-item
                                    >
                                </b-dropdown>
                            </div>
                            <div class="btn-tf">
                                <b-button
                                    v-for="mode in modes"
                                    :key="mode.val"
                                    @click="editingModeChanged(mode.val)"
                                    :pressed="modeChosen(mode.val)"
                                    class="sidebarCollapse mr-4 pMt-2"
                                    v-b-tooltip.hover.bottom
                                    :title="mode.title"
                                >
                                    <i :class="mode.icon"></i>
                                </b-button>
                            </div>
                        </b-row>
                    </b-col>
                </b-row>
            </div>
        </b-col>
    </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import Waiting from '@/components/misc/Waiting.vue';
import ArtefactService from '@/services/artefact';
import SignInterpretationService from '@/services/sign-interpretation';
import ArtefactSideMenu from '@/views/artefact-editor/artefact-side-menu.vue';
import TextSide from '@/views/artefact-editor/text-side.vue';
import {
    ArtefactEditorParams,
    ArtefactEditorParamsChangedArgs,
} from '@/views/artefact-editor/types';
import { IIIFImage, ImageStack } from '@/models/image';
import { Position, Side } from '@/models/misc';
import { ArtefactTextFragmentData } from '@/models/text';

import {
    ImageSetting,
    normalizeOpacity,
} from '@/components/image-settings/types';
import { SignInterpretation, InterpretationRoi, Line } from '@/models/text';
import { Polygon } from '@/utils/Polygons';
import { ImagedObject } from '@/models/imaged-object';
import { BoundingBox, DropdownOption } from '@/utils/helpers';
import ImageSettingsComponent from '@/components/image-settings/ImageSettings.vue';
import ImagedObjectService from '@/services/imaged-object';
import { Artefact } from '@/models/artefact';
import { DrawingMode, EditorParamsChangedArgs, ModeButtonInfo } from './types';
import { ImagedObjectEditorParams } from '@/views/imaged-object-editor/types';
import { PropOptions } from 'vue';
import { ImagedObjectState } from '../../state/imaged-object';
import ZoomToolbox from '@/components/toolbars/zoom-toolbox.vue';
import RotationToolbox from '@/components/toolbars/rotation-toolbox.vue';

@Component({
    name: 'artefcat-editor-toolbar',
    components: {
        'image-settings': ImageSettingsComponent,
        'zoom-toolbox': ZoomToolbox,
        'rotation-toolbox': RotationToolbox,
    },
})
export default class ImagedObjectEditorToolbar extends Vue {
    private sideFilter: DropdownOption = {} as DropdownOption;

    private errorMessage: string = '';
    private imagedObjectService: ImagedObjectService = new ImagedObjectService();
    private artefactService: ArtefactService = new ArtefactService();
    private imageStack: ImageStack = {} as ImageStack;
    private newArtefactName: string = '';
    private waiting: boolean = false;

    @Prop() private artefact!: Artefact;
    @Prop() private imagedObject!: ImagedObject;
    @Prop() private modes!: ModeButtonInfo[];

    @Prop({ type: Array, default: () => [] })
    private artefacts!: PropOptions<Artefact[]>;

    @Prop({
        type: String as () => Side,
    })
    private side!: Side;

    private get params(): ImagedObjectEditorParams {
        return this.imagedObjectState.params!;
    }
    public get imagedObjectState(): ImagedObjectState {
        return this.$state.imagedObject!;
    }
    public get editionId(): number {
        return parseInt(this.$route.params.editionId);
    }

    public get scrolled(): boolean {
        return true;
    }

    public get zoomImagedObject(): number {
        return this.params.zoom;
    }

    public set zoomImagedObject(val: number) {
        this.imagedObjectState.params!.zoom = parseFloat(val.toString());
        // this.notifyChange('zoomImagedObject', val);
    }

    private onZoomChanged(val: number) {
        this.params.zoom = val; //
        // this.imagedObjectState.params!.zoom = val  ;
    }

    public onRotationAngleChanged(val: number) {
        this.params.rotationAngle = val;
        this.notifyChange('rotationAngle', this.params.rotationAngle);
    }

    public get readOnly(): boolean {
        return this.$state.editions.current!.permission.readOnly;
    }
    public get background(): boolean {
        return this.params.background;
    }
    public set background(val: boolean) {
        this.imagedObjectState.params!.background = val;
        // this.notifyChange('background', val);
    }

    public get highLight(): boolean {
        return this.params.highLight;
    }
    public set highLight(val: boolean) {
        this.imagedObjectState.params!.highLight = val;
        // this.notifyChange('highLight', val);
    }

    public get sideOptions(): DropdownOption[] {
        const options = [] as DropdownOption[];

        if (!this.imagedObject) {
            return [];
        }

        if (this.imagedObject.recto) {
            options.push({ displayName: 'Recto', name: 'recto' });
        }

        if (this.imagedObject.verso) {
            options.push({ displayName: 'Verso', name: 'verso' });
        }

        return options;
    }

    public sideFilterChanged(filter: DropdownOption) {
        this.sideFilter = filter;
        this.$emit('onSideArtefactChanged', filter);
    }

    public async mounted() {
        const index = this.sideOptions.findIndex((a) => a.name === this.side);
        if (index < 0) {
            throw new Error("Side has to be either 'recto' or 'verso'");
        }
        this.sideFilter = this.sideOptions[index];
    }

    public notifyChange(paramName: string, paramValue: any) {
        const args = {
            property: paramName,
            value: paramValue,
            params: this.params,
        } as EditorParamsChangedArgs;
        this.$emit('paramsChanged', args);
    }



    public onImageSettingChanged(settings: ImageSetting) {
        this.notifyChange('imageSettings', this.params.imageSettings);
    }


    private editingModeChanged(val: any) {
        (this as any).params.drawingMode = DrawingMode[val];
    }

    private modeChosen(val: DrawingMode): boolean {
        return (
            DrawingMode[val].toString() === this.params.drawingMode.toString()
        );
    }

}
</script>

<style lang="scss">
.popover-body {
    margin-left: 10px;
}
/* .input-lg {
    width: 75px;
} */
/* .rotation {
    width: 40px;
    text-align: center;
} */
#popover-adjust:hover {
    color: #007bff;
    background-color: white;
}
</style>
