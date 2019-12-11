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
import Vue from 'vue';
import { SingleImageSetting } from '../image-settings/types';

export default Vue.extend({
    name: 'single-image-setting',
    props: {
        type: String,
        settings: {
            // Ugly, taken from
            // https://frontendsociety.com/using-a-typescript-interfaces-and-types-as-a-prop-type-in-vuejs-508ab3f83480
            type: Object as () => SingleImageSetting
        }
    },
    computed: {
        opacity: {
            get() {
                return this.settings.opacity;
            },
            set(value) {
                this.settings.opacity = +value;
            }
        }
    },
    methods: {
        onChange() {
            // use setTimeout because checkbox models update *after* the change event is fired
            setTimeout(() => {
                console.log(`onChange, ${this.settings.opacity}, ${this.settings.visible}`);
               
                this.$emit('change', this.settings);
            }, 0);
        }
    }
});
</script>

<style lang="scss" scoped>
</style>
