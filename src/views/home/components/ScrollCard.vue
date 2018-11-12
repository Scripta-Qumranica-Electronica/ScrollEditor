<template>
    <b-card :title="scroll.name"
    >
    </b-card>
</template>

<script lang="ts">
import Vue from 'vue';
import Combination from '@/models/combination';

export default Vue.extend({
  name: 'scroll-card',
  props: {
    scroll: Combination,
  },
});

</script>

<style lang="scss" scoped>

</style>


