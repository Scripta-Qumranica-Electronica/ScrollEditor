<template>
    <div>
        <label>
            Sign canvas
        </label>
    </div>
</template>


<script lang="ts">
import Vue from 'vue';
import { ShapeSign } from './types';

export default Vue.extend({
    name: 'sign-canvas',
    props: {
    shapeSign: {
        type: Object as () => ShapeSign,
        },
    },
    mounted() {
        console.log('shapeSign=', this.shapeSign);
    }
    // state.signMap.set(sign, polygon);
});

</script>


<style lang="scss" scoped>
</style>
