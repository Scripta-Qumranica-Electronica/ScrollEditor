<template>
  <div class="card">
    <router-link tag="a" :to="{ name: 'scroll-ver', params: { id: scroll.defaultScrollVersionId }}">
      <!--TODO do not hardcode the image proxy server-->
      <img class="card-img-top" v-if="thumbnailSource" v-lazy="`https://www.qumranica.org/image-proxy?address=${thumbnailSource}`" :alt="scroll.name">
      <img class="card-img-top" v-else src="@/assets/images/if_scroll_1375614.svg" :alt="scroll.name">
    </router-link>
    <div class="card-body">
      <router-link tag="div" :to="{ name: 'scroll-ver', params: { id: scroll.defaultScrollVersionId }}">
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
import { ScrollInfo } from '@/models/scroll';

export default Vue.extend({
  name: 'scroll-card',
  props: {
    scroll: ScrollInfo,
  },
  computed: {
    thumbnailSource(): string | undefined {
      return this.scroll.thumbnailUrls.length ? this.scroll.thumbnailUrls[0] : undefined;
    },
    publicVersionCount(): number {
      return this.scroll.scrollVersionIds.length;
    },
    personalVersionCount(): number {
      return 0;
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