<template>
  <div class="card">
    <router-link tag="a" :to="{  path:`/scroll/${scrollVer.versionId}` }">
      <!--TODO do not hardcode the image proxy server-->
      <img class="card-img-top" v-if="thumbnailSource" v-lazy="`https://www.qumranica.org/image-proxy?address=${thumbnailSource}`" :alt="scrollVer.name">
      <img class="card-img-top" v-else src="@/assets/images/if_scroll_1375614.svg" :alt="scrollVer.name">
    </router-link>
    <div class="card-body">
      <router-link tag="div" :to="{  path:`/scroll/${scrollVer.versionId}` }">
        <h5 class="cart-title"> {{ scrollVer.name }}</h5>
        <p v-if="shareCount">
          <b-btn v-b-popover.hover="shareNames" title="Shares" class="share">
            <span class="badge badge-info mr-1">{{ shareCount }}</span>{{ $tc('home.shares', shareCount)}}
          </b-btn>
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
    },
    shareNames(): string {
      var names = "";
      for (var i = 1 ; i < this.scrollVer.shares.length; i++) {
        names += this.scrollVer.shares[i].user.userName;
        if (i <  this.scrollVer.shares.length-1) {
          names += ", ";
        }
      }
      return names;
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

.share {
  color: black; 
  background-color: white
}
</style>