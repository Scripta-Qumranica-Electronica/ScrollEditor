<template>
  <div class="card">
    <img class="card-img-top" v-if="thumbnailSource" :src="thumbnailSource" :alt="scroll.name">
    <img class="card-img-top" v-if="!thumbnailSource" src="@/assets/images/if_scroll_1375614.svg" :alt="scroll.name">
    <h5 class="cart-title"> {{ scroll.name }}</h5>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import Scroll from '@/models/scroll';

export default Vue.extend({
  name: 'scroll-card',
  props: {
    scroll: Scroll,
  },
  computed: {
    thumbnailSource(): string | undefined {
      return this.scroll.thumbnailUrls.length ? this.scroll.thumbnailUrls[0] : undefined;
    }
  }
});

</script>

<style lang="scss" scoped>
img {
  display: block;
  height: 100px;
  max-height: 100px;
}
</style>