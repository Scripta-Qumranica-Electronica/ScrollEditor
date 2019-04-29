<template>
  <div class="card">
    <router-link tag="a" :to="{  path:`/edition/${edition.id}` }">
      <!--TODO do not hardcode the image proxy server-->
      <img class="card-img-top" v-if="thumbnailSource" v-lazy="thumbnailSource" :alt="edition.name">
      <img class="card-img-top" v-else src="@/assets/images/if_scroll_1375614.svg" :alt="edition.name">
    </router-link>
    <div class="card-body">
      <router-link tag="div" :to="{  path:`/edition/${edition.id}` }">
        <h5 class="cart-title"> {{ edition.name }}</h5>
      <!--  <p v-if="shareCount">
          <b-btn v-b-popover.hover="shareNames" title="Shares" class="share">
            <span class="badge badge-info mr-1">{{ shareCount }}</span>{{ $tc('home.shares', shareCount)}}
          </b-btn>
        </p> -->
      </router-link>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import { EditionInfo } from '@/models/edition';

export default Vue.extend({
  name: 'edition-version-card',
  props: {
    edition: EditionInfo,
  },
  computed: {
    thumbnailSource(): string | undefined {
      return this.edition.thumbnailUrl.length ? this.edition.thumbnailUrl[0].thumbnailUrl : undefined;
    },
    shareCount(): number {
      return this.edition.shares.length - 1; // One is the current user
    },
    shareNames(): string {
      const names = this.edition.shares.map((share) => share.user.userName);
      return names.join(', ');
    }
  },
});

</script>

<style lang="scss" scoped>
img.card-img-top {
  display: block;
  height: 100px;
  max-height: 100px;
  object-fit: cover;
}
h5 {
  cursor: pointer;
}

.share {
  color: black; 
  background-color: white
}
</style>