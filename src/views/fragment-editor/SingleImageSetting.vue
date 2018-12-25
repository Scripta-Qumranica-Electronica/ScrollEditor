<template>
    <div class="row">
        <div class="col">
            <b-form-checkbox v-model="settings.show">{{ type }}</b-form-checkbox>
        </div>
        <div class="col">
            <b-form-input v-model="settings.intesity" type="range" min="0" max="100"></b-form-input>
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
            // Ugly, taking from here: https://frontendsociety.com/using-a-typescript-interfaces-and-types-as-a-prop-type-in-vuejs-508ab3f83480
            type: Object as () => SingleImageSetting,
        },
    }
});
</script>

<style lang="scss" scoped>
</style>
