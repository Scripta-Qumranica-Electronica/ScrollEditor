<template>
    <div id="artefact-toolbar">
        <b-col class="p-3">
            <div>
                <b-row v-align="center">
                    <b-col class="col-2">
                        <b-button-group>
                            <b-button
                                @click="zoomClick(-5)"
                                :disabled="!canZoomOut"
                                variant="outline-secondary"
                                ><i class="fa fa-minus"></i
                            ></b-button>
                            <b-input
                                v-model="zoom"
                                type="number"
                                min="1"
                                max="100"
                                style="width: 75px"
                            ></b-input>
                            <b-button
                                class="mr-0"
                                @click="zoomClick(5)"
                                :disabled="!canZoomIn"
                                variant="outline-secondary"
                                ><i class="fa fa-plus"></i
                            ></b-button>
                        </b-button-group>
                    </b-col>
                    <b-col class="p-0 col-2 ml-3">
                        <b-button
                            id="popover-1-bottom"
                            variant="outline-secondary"
                            ><img class="mr-1" src="@/assets/images/adjust.svg" />
                            <span>Adjust image</span>
                        </b-button>
                        <b-popover
                            class="popover-body"
                            target="popover-1-bottom"
                            triggers="click"
                            placement="bottom"
                            container="my-container"
                            ref="popover"
                        >
                            <div>
                                <image-settings
                                    :imageStack="
                                        imagedObject.getImageStack(
                                            this.artefact.side
                                        )
                                    "
                                    id="popover-input-1"
                                    :params="params"
                                    @imageSettingChanged="
                                        onImageSettingChanged($event)
                                    "
                                />
                            </div>
                        </b-popover>
                    </b-col>
                    <b-col class="p-0 col-2">
                        <b-button-group>
                            <b-button
                                @click="onRotateClick(-90)"
                                v-b-tooltip.hover.bottom
                                :title="$t('misc.leftRotate')"
                                class="mr-0"
                            >
                                <font-awesome-icon
                                    icon="undo"
                                ></font-awesome-icon>
                            </b-button>
                            <b-button
                                @click="onRotateClick(90)"
                                v-b-tooltip.hover.bottom
                                class="ml-1"
                                :title="$t('misc.RightRotate')"
                            >
                                <font-awesome-icon
                                    icon="redo"
                                ></font-awesome-icon>
                            </b-button>
                        </b-button-group>
                        <span style="width: 40px; text-align: center">
                            {{ rotationAngle }} °
                        </span>
                    </b-col>
                    <b-col class="col-4">
                        <b-row>
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
                                <b-dropdown :text="sideFilter.displayName">
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
import ArtefactImage from '@/views/artefact-editor/artefact-image.vue';
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
import ImageLayer from '@/views/artefact-editor/image-layer.vue';
import RoiLayer from '@/views/artefact-editor/roi-layer.vue';
import BoundaryDrawer, {
    ActionMode,
} from '@/components/polygons/boundary-drawer.vue';
import Zoomer, {
    ZoomEventArgs,
    RotateEventArgs,
} from '@/components/misc/zoomer.vue';
import TextService from '@/services/text';
import SignWheel from '@/views/artefact-editor/sign-wheel.vue';
import EditionIcons from '@/components/cues/edition-icons.vue';
import { EditionInfo } from '../../models/edition';

import {
    SavingAgent,
    OperationsManager,
    OperationsManagerStatus,
} from '@/utils/operations-manager';
import SignAttributePane from '@/components/sign-attributes/sign-attribute-pane.vue';
import ImageSettingsComponent from '@/components/image-settings/ImageSettings.vue';
import ImagedObjectService from '@/services/imaged-object';
import { Artefact } from '@/models/artefact';
import { DrawingMode, EditorParamsChangedArgs } from './types';
import { ImagedObjectEditorParams } from '@/views/imaged-object-editor/types';
import { PropOptions } from 'vue';
@Component({
    name: 'artefcat-editor-toolbar',
    components: {
        'image-settings': ImageSettingsComponent,
    },
})
export default class ImagedObjectEditorToolbar extends Vue {
    // private zoomInput: number = 1;
    private sideFilter: DropdownOption = {} as DropdownOption;

    private errorMessage: string = '';
    private imagedObjectService: ImagedObjectService = new ImagedObjectService();
    private artefactService: ArtefactService = new ArtefactService();
    private imageStack: ImageStack = {} as ImageStack;
    private newArtefactName: string = '';
    private waiting: boolean = false;
    @Prop() private artefact!: Artefact;
    @Prop() private imagedObject!: ImagedObject;
    @Prop({ type: Array, default: () => [] })
    private artefacts!: PropOptions<Artefact[]>;
    // @Prop() private editable: boolean = true;
    @Prop({
        type: String as () => Side,
    })
    private side!: Side;
    @Prop()
    private params: ImagedObjectEditorParams = {} as ImagedObjectEditorParams;

    public get editionId(): number {
        return parseInt(this.$route.params.editionId);
    }

    public get scrolled(): boolean {
        return true;
    }

    public get zoom(): number {
        return Math.round(this.params.zoom * 100);
    }

    public set zoom(val: number) {
        this.params.zoom = parseFloat(val.toString()) / 100;
        this.notifyChange('zoom', val);
    }

    public get canZoomIn(): boolean {
        return this.params.zoom + 5 / 100 <= 1;
    }

    public get canZoomOut(): boolean {
        return this.params.zoom - 5 / 100 >= 0;
    }

    public get rotationAngle(): number {
        return ((this.params.rotationAngle % 360) + 360) % 360;
    }
    public set rotationAngle(val: number) {
        this.params.rotationAngle =
            ((parseFloat(val.toString()) % 360) + 360) % 360;
        this.notifyChange('rotationAngle', val);
    }
    public get zoomImagedObject(): number {
        return this.params.zoom;
    }
    public set zoomImagedObject(val: number) {
        this.params.zoom = parseFloat(val.toString());
        this.notifyChange('zoomImagedObject', val);
    }

    public get readOnly(): boolean {
        return this.$state.editions.current!.permission.readOnly;
    }
    public get background(): boolean {
        return this.params.background;
    }
    public set background(val: boolean) {
        this.params.background = val;
        this.notifyChange('background', val);
    }

    public get highLight(): boolean {
        return this.params.highLight;
    }
    public set highLight(val: boolean) {
        this.params.highLight = val;
        this.notifyChange('highLight', val);
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
    public get canCreate(): boolean {
        return this.newArtefactName.trim().length > 0;
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

    public zoomClick(percent: number) {
        this.params.zoom += percent / 100;
        this.notifyChange('zoomImagedObject', this.params.zoom);
    }
    public onImageSettingChanged(settings: ImageSetting) {
        this.notifyChange('imageSettings', this.params.imageSettings);
    }
    public onRotateClick(degrees: number) {
        this.params.rotationAngle += degrees;
        this.notifyChange('rotationAngle', this.params.rotationAngle);
    }
    public async newArtefact() {
        this.newArtefactName = this.newArtefactName.trim();

        let newArtefact = {} as Artefact;
        this.waiting = true;
        this.errorMessage = '';
        try {
            newArtefact = await this.artefactService.createArtefact(
                this.editionId,
                this.imagedObject,
                this.newArtefactName,
                this.side as Side
            );
        } catch (err) {
            this.errorMessage = err;
        } finally {
            this.waiting = false;
        }

        this.newArtefactName = '';
        (this.$refs.newArtRef as any).hide();
        this.chooseArtefact(newArtefact);

        this.onDrawChanged('DRAW');
        this.$emit('create', newArtefact);
    }
    public newModalShown() {
        // this.waiting = true;
        (this.$refs.newArtefactName as any).focus();
    }
    public onDrawChanged(val: any) {
        // DrawingMode
        const mode = DrawingMode[val];
        (this as any).params.drawingMode = mode;
        this.notifyChange('drawingMode', mode);
    }
    public chooseArtefact(art: Artefact) {
        this.$emit('artefactChanged', art);
    }
}
</script>

<style lang="scss">
.popover-body {
    margin-left: 10px;
}
</style>
