<template>
  <div class="card">
    <router-link tag="a" :to="{ name: 'scroll-ver', params: { id: scrollVer.versionId }}">
      <img class="card-img-top" v-if="thumbnailSource" :src="thumbnailSource" :alt="scrollVer.name">
      <img class="card-img-top" v-if="!thumbnailSource" src="@/assets/images/if_scroll_1375614.svg" :alt="scrollVer.name">
    </router-link>
    <div class="card-body">
      <router-link tag="div" :to="{ name: 'scroll-ver', params: { id: scrollVer.versionId }}">
        <h5 class="cart-title"> {{ scrollVer.name }}</h5>
        <p v-if="shareCount">
          <span class="badge badge-info mr-1">{{ shareCount }}</span>{{ $tc('home.shares', shareCount)}}
        </p>
      </router-link>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import { ScrollVersionInfo } from '@/models/scroll';

export default Vue.extend({
  name: 'scroll-version-card',
  props: {
    scrollVer: ScrollVersionInfo,
  },
  computed: {
    thumbnailSource(): string | undefined {
      return this.scrollVer.thumbnailUrls.length ? this.scrollVer.thumbnailUrls[0] : undefined;
    },
    shareCount(): number {
      return this.scrollVer.shares.length - 1; // One is the current user
    }
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