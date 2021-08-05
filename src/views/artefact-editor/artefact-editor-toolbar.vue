<template>
    <b-row align-v="center" id="artefact-toolbar">
        <!-- <b-col class="col-6 col-md-7 col-sm-6 col-xs-6 position-zoom"> -->
        <b-col>
            <zoom-toolbox
                    v-model="params.zoom"
                    delta="0.05"
                    @zoomChanged="onZoomChanged($event)"
            />
        </b-col>
        <b-col>
            <rotation-toolbox
                    v-model="params.rotationAngle"
                    delta="1"
                    :enable-text="true"
                    @rotationAngleChanged="onRotationAngleChanged($event)"
            />
        </b-col>
        <b-col>
            <toolbox subject="">
                <b-button
                    id="popover-adjust"
                    variant="outline-secondary"
                    :disabled="this.artefact.isVirtual"
                    ><img
                        class="mr-1"
                        src="@/assets/images/adjust.svg"
                    />
                    <span>Adjust image</span>
                </b-button>
                <b-popover
                    class="popover-body"
                    target="popover-adjust"
                    triggers="focus"
                    placement="bottom"
                    container="my-container"
                    ref="popover"
                >
                    <div>
                        <image-settings
                            :imageStack="imageStack"
                            id="popover-input-1"
                            :params="params"
                            @imageSettingChanged="
                                onImageSettingChanged($event)
                            "
                        />
                    </div>
                </b-popover>
            </toolbox>
        </b-col>
        <!-- <b-col class="col-5 col-md-6 col-sm-5 col-xs-5 position-rotate"> -->
        <b-col class="col position-rotate">

        </b-col>
    </b-row>
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

import {
    ImageSetting,
} from '@/components/image-settings/types';
import ImageSettingsComponent from '@/components/image-settings/ImageSettings.vue';
import ImagedObjectService from '@/services/imaged-object';
import { Artefact } from '@/models/artefact';
import { ArtefactEditorState } from '@/state/artefact-editor';
import ZoomToolbox from '@/components/toolbars/zoom-toolbox.vue';
import RotationToolbox from '@/components/toolbars/rotation-toolbox.vue';
import Toolbox from '@/components/toolbars/toolbox.vue';

@Component({
    name: 'artefcat-editor-toolbar',
    components: {
        'image-settings': ImageSettingsComponent,
         'zoom-toolbox': ZoomToolbox,
         'rotation-toolbox': RotationToolbox,
         toolbox: Toolbox,
    },
})

export default class ArtefactEditorToolbar extends Vue {
    private errorMessage: string = '';
    private imagedObjectService: ImagedObjectService = new ImagedObjectService();
    private imageStack: ImageStack = {} as ImageStack;

    @Prop() private artefact!: Artefact;
    // @Prop() private params: ArtefactEditorParams = {} as ArtefactEditorParams;

    public get editionId(): number {
        return parseInt(this.$route.params.editionId);
    }
    public get artefactEditorState(): ArtefactEditorState {
        return this.$state.artefactEditor;
    }
    private get params(): ArtefactEditorParams {
        return this.artefactEditorState.params || new ArtefactEditorParams();
    }

    public get scrolled(): boolean {
        return true;
    }

    public get zoomArtefact(): number {
        return this.params.zoom;
    }
    public set zoomArtefact(val: number) {
        this.params.zoom = parseFloat(val.toString());
        this.notifyChange('zoomArtefact', val);
    }

    public get readOnly(): boolean {
        return this.$state.editions.current!.permission.readOnly;
    }

    public async mounted() {
        await this.$state.prepare.edition(this.artefact.editionId);

        if (!this.artefact.isVirtual) {
            const imagedObject = this.$state.imagedObjects.find(
                this.artefact.imagedObjectId
            );
            if (!imagedObject) {
                throw new Error(
                    `Can't find ImagedObject ${this.artefact.imagedObjectId} for artefact ${this.artefact.id}`
                );
            }
            this.imageStack = imagedObject.getImageStack(this.artefact.side)!;
        }
    }


    public notifyChange(paramName: string, paramValue: any) {
        const args = {
            property: paramName,
            value: paramValue,
            params: this.params,
        } as ArtefactEditorParamsChangedArgs;
        this.$emit('paramsChanged', args);
    }
    public onImageSettingChanged(settings: ImageSetting) {
        this.notifyChange('imageSettings', this.params.imageSettings);
    }

    public onRotationAngleChanged(val: number) {
        this.params.rotationAngle = val;
        this.notifyChange('rotationAngle', this.params.rotationAngle);
    }

    private onZoomChanged(val: number) {
        this.params.zoom = val; //
        this.notifyChange('zoomArtefact', this.params.zoom);
    }

}
</script>

<style lang="scss">
#artefact-side-menu {
    touch-action: pan-y;
    top: 0;
    right: 0;
}
span.selected {
    font-weight: bold;
}
section {
    margin-bottom: 20px;
}
button {
    margin-right: 10px;
}
.btn-info {
    background-color: #6c757d;
    border-color: #6c757d;
}
.popover-body {
    margin-left: 10px;
}
/* .input-lg {
    width: 50% !important;
    max-width: 75px;
} */

#popover-adjust:hover {
    color: #007bff;
    background-color: white;
}
</style>
