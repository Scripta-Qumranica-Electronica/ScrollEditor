<template>
    <div class="row">
        <div class="col-5">
            <b-form-checkbox v-model="settings.visible" @change="onVisibleChange">{{ type }}</b-form-checkbox>
        </div>
        <div class="col">
            <b-form-input
                v-model="opacity"
                type="range"
                min="0"
                max="1"
                step="0.05"
               @input="onOpacityInput"
            ></b-form-input> <!-- Instead of change, find an event that is reported during tracking, or use a watcher -->
        </div>
    </div>
</template>

<script lang="ts">
// TODO:
// 1. Add event handlers when data changes.
// 2. Raise an event (call changed, parameter is settings) when data changes
// 3. Use i18n for the type
// 4. Add tooltip to the slider (with the current number)
// 5. Disable slider when checkbox is false
import { Component, Prop, Vue, Emit, Watch } from 'vue-property-decorator';
import { SingleImageSetting } from '../image-settings/types';

@Component({
    name: 'single-image-setting',
})
export default class SingleImageSettingComponent extends Vue {
    @Prop() private type!: string;
    @Prop() private settings!: SingleImageSetting;

    private opacity = '1';
    // private visible = true;

    private mounted() {
        this.opacity = this.settings.opacity.toString(); // Binding works with strings
        // this.visible = this.settings.visible;
    }

    private onVisibleChange() {
        // Use setTimeout since the binding occurs after the input event
        setTimeout(() => {
            // this.settings.visible = this.visible;
            this.change();
        }, 0);
    }

    private onOpacityInput() {
        // We use @input because we want to update the images as the slider slides.
        // @change only occurs once the slider stops sliding.

        if (!this.settings.visible) {
            // Set the visibility checkbox when moving a slider
            this.settings.visible = true;
            this.onVisibleChange();
        }

        // use setTimeout because checkbox models update *after* the change event is fired
        setTimeout(() => {
            this.settings.opacity = parseFloat(this.opacity);
            this.change();
        }, 0);
    }

    @Emit()
    private change() {
        return this.settings;
    }
}
</script>

<style lang="scss" scoped>
</style>
