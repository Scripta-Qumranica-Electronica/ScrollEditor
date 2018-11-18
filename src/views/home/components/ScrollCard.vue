<template>
  <div class="card">
    <img class="card-img-top" :src="thumbnailSource" :alt="scroll.name">
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
    thumbnailSource(): string {
      if (this.scroll.thumbnailUrls.length) {
        return this.scroll.thumbnailUrls[0];
      }

      return '@/assets/images/if_scroll_1375614.svg';
    }
  }
});

</script>

<style lang="scss" scoped>
img {
  display: block;
  height: 100px;
}
</style>


