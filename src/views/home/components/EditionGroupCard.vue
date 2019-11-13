<template>
  <div class="card">
    <router-link tag="a" :to="{ path:`/editions/${edition.id}` }">
      <!--TODO do not hardcode the image proxy server-->
      <img class="card-img-top" v-if="thumbnailSource" v-lazy="thumbnailSource" :alt="edition.name">
      <img class="card-img-top" v-else src="@/assets/images/if_scroll_1375614.svg" :alt="edition.name">
    </router-link>
    <div class="card-body">
      <router-link tag="div" :to="{ path:`/editions/${edition.id}` }">
        <h5 class="cart-title"> {{ edition.name }}</h5>
        <p>
          <span class="badge badge-info mr-1">{{ publicEditionCount }}</span>{{ $tc('home.publicEditionCount',
            publicEditionCount)}}
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
import { Component, Prop, Vue, Mixins } from 'vue-property-decorator';
import { EditionInfo } from '@/models/edition';

@Component({
    name: 'edition-card'
})

export default class EditionCard extends Vue {
    @Prop() public edition!: EditionInfo;

    private get thumbnailSource(): string | undefined {

        return this.edition.thumbnail
            ? this.edition.thumbnail.thumbnailUrl
            : undefined;
    }

    private get publicEditionCount(): number {
        return this.edition.publicCopies;
    }

    private get personalVersionCount(): number {
           return 0; // TODO: Return the actual number
    }
}



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
</style>