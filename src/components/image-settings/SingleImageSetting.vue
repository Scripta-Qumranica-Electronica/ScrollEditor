<template>
    <div class="row">
        <b-form-checkbox v-model="settings.visible" @change="onChange">{{ type }}</b-form-checkbox>
        <div class="col">
            <b-form-input
                v-model="opacity"
                type="range"
                min="0"
                max="1"
                step="0.05"
              
               @input="onChange"
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
import { Component, Prop, Vue, Emit } from 'vue-property-decorator';
import { SingleImageSetting } from '../image-settings/types';

@Component({
    name: 'single-image-setting',
})
export default class SingleImageSettingComponent extends Vue {
    @Prop() private type!: string;
    @Prop() private settings!: SingleImageSetting;

    private get opacity() {
        return this.settings.opacity;
    }
    private set opacity(value) {
        this.settings.opacity = value;
    }

    private onChange() {
        // use setTimeout because checkbox models update *after* the change event is fired
        setTimeout(() => {
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
