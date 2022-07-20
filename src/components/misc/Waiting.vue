<template>
    <div class="row justifty-content-sm-center center">
        <font-awesome-icon icon="spinner" size="6x" spin></font-awesome-icon>
    </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';

@Component({
//   name: 'home',
 name: 'waiting',
})

export default class Waiting extends Vue {}
</script>

<style>
.center {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100vh;
}
</style>
