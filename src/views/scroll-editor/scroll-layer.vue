<template>
    <div>layer</div>
</template>

<!-- <script src="https://unpkg.com/vue-toasted"></script>-->
<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import Waiting from '@/components/misc/Waiting.vue';
import ScrollMenu from './scroll-menu.vue';

@Component({
    name: 'scroll-layer',
    components: {
        Waiting
    }
})
export default class ScrollLayer extends Vue {}
</script>

<style lang="scss" scoped>
</style>
