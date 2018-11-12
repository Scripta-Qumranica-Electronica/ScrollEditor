<template>
    <div class="row justifty-content-sm-center center">
        <font-awesome-icon icon="spinner" size="6x" spin></font-awesome-icon>
    </div>
</template>

<script lang="ts">
import Vue from 'vue';

export default Vue.extend({
  name: 'home',
});
</script>

<style>
.center {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100vh;
}
</style>
