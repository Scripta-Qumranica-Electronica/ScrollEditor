<template>
    <div class="row">
        <div class="col">
            <b-form-checkbox v-model="settings.visible" @change="onChange">{{ type }}</b-form-checkbox>
        </div>
        <div class="col">
            <b-form-input v-model="settings.opacity" type="range" min="0" max="100" @change="onChange"></b-form-input>
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
import { SingleImageSetting } from './types';

export default Vue.extend({
    name: 'single-image-setting',
    props: {
        type: String,
        settings: {
            // Ugly, taken from
            // https://frontendsociety.com/using-a-typescript-interfaces-and-types-as-a-prop-type-in-vuejs-508ab3f83480
            type: Object as () => SingleImageSetting,
        },
    },
    methods: {
        onChange() {
            // use setTimeout because checkbox models update *after* the change event is fired
            setTimeout(() => {
                this.$emit('change', this.settings);
            } , 0);
        }
    }
});
</script>

<style lang="scss" scoped>
</style>
