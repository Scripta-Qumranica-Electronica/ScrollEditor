<template>
    <div class="row justifty-content-sm-center center">
        <font-awesome-icon icon="spinner" size="6x" spin></font-awesome-icon>
    </div>
</template>

<script lang="ts">
import { Component, Vue, toNative } from 'vue-facing-decorator';

@Component({
//   name: 'home',
 name: 'waiting',
})
class Waiting extends Vue {}
export default toNative(Waiting);
</script>

<style>
.center {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100vh;
}
</style>
