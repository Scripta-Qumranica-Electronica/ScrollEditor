<template>
    <toolbox :subject="subject">
        <b-button id="popover-adjust" variant="outline-secondary"
            ><img class="mr-1" src="@/assets/images/adjust.svg" />
            <span>Adjust image</span>
        </b-button>
        <b-popover
            class="popover-body"
            target="popover-adjust"
            triggers="focus"
            placement="bottom"
        >
            <div>
                <image-settings
                    :imageStack="imageStack"
                    id="popover-input-1"
                    :params="params"
                    @image-setting-changed="onImageSettingChanged"
                />
            </div>
        </b-popover>
    </toolbox>
</template>
<script lang="ts">
import { ImageStack } from '@/models/image';
import { ArtefactEditorParams } from '@/views/artefact-editor/types';
import Vue from 'vue';
import { Component, Prop } from 'vue-property-decorator';
import ImageSettingsComponent from '../image-settings/ImageSettings.vue';
import { SingleImageSetting } from '../image-settings/types';
import Toolbox from './toolbox.vue';

@Component({
    name: 'adjust-image-toolbox',
    components: {
        'image-settings': ImageSettingsComponent,
        toolbox: Toolbox,
    },
})
export default class AdjustImageToolbox extends Vue {
    @Prop({ default: '' }) public subject!: string;
    @Prop() public imageStack!: ImageStack;
    @Prop() public params!: ArtefactEditorParams;

    protected onImageSettingChanged(event: SingleImageSetting) {
        this.$emit('image-settings-changed', event);
    }
}
</script>