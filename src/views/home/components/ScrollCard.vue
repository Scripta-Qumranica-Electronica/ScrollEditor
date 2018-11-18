<template>
  <div class="card">
    <router-link tag="a" :to="{ path: '/scroll', params: { id: scroll.id } }">
      <img class="card-img-top" v-if="thumbnailSource" :src="thumbnailSource" :alt="scroll.name">
      <img class="card-img-top" v-if="!thumbnailSource" src="@/assets/images/if_scroll_1375614.svg" :alt="scroll.name">
    </router-link>
    <div class="card-body">
      <router-link tag="div" :to="{ path: '/scroll', params: { id: scroll.id } }">
        <h5 class="cart-title"> {{ scroll.name }}</h5>
        <p>
          <span class="badge badge-info mr-1">{{ publicVersionCount }}</span>{{ $tc('home.publicVersionCount', publicVersionCount)}}
        </p>
        <p v-if="personalVersionCount">
          <span class="badge badge-info mr-1">{{ personalVersionCount }}</span>{{ $tc('home.personalVersionCount', personalVersionCount)}}
        </p>
        <p v-if="!personalVersionCount">&nbsp;</p>
      </router-link>
    </div>
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
    },
    publicVersionCount(): number {
      return this.scroll.scrollVersionIds.length;
    },
  },
});

</script>

<style lang="scss" scoped>
img {
  display: block;
  height: 100px;
  max-height: 100px;
}
h5 {
  cursor: pointer;
}
</style>