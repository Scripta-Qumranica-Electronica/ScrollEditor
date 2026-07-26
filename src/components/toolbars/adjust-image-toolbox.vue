<template>
    <toolbox :subject="subject">
        <!-- not using the toolbar-icon-button because we want our own popover -->
        <b-button id="popover-adjust" variant="outline-secondary"
            ><img class="me-1" src="@/assets/images/adjust.svg" />
            <span class="d-none d-xl-inline">Adjust image</span>
        </b-button>
        <!--
            bootstrap-vue-next dropped Bootstrap-Vue v2's `triggers="click blur"`
            STRING api; the same markup left the popover with no working trigger, so
            it never opened. The v2 "click blur" (open on click, close on outside
            click) maps to the boolean `click` trigger prop, which toggles on target
            click and auto-closes on an outside click while keeping the sliders
            inside interactive.
        -->
        <b-popover
            class="popover-body"
            target="popover-adjust"
            click
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
import { Component, Prop, Vue, toNative } from 'vue-facing-decorator';
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
class AdjustImageToolbox extends Vue {
    @Prop({ default: '' }) public subject!: string;
    @Prop() public imageStack!: ImageStack;
    @Prop() public params!: ArtefactEditorParams;

    public onImageSettingChanged(event: SingleImageSetting) {
        // Match the event the parent toolbar listens for (@image-setting-changed); it was
        // emitting the plural "image-settings-changed", so the toolbar's handler never fired.
        this.$emit('image-setting-changed', event);
    }
}
export default toNative(AdjustImageToolbox);
</script>
