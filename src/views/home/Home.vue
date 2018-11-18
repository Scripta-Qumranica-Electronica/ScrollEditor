<template>
  <div class="row">
    <div class="col-sm-12 col-md-10 offset-md-1 col-lg-8 offset-lg-2">
      <b-row><b-col>
        <search-scroll :disabled="searching"></search-scroll>
      </b-col></b-row>
      <ul class="list-unstyled row mt-5" id="search-results" v-if="!searching">
        <li class="col-sm-6 col-md-4 col-lg-3 mt-5 list-item" v-for="scroll in allScrolls" :key="scroll.id">
          <scroll-card :scroll="scroll"></scroll-card>
        </li>
      </ul>
      <b-row v-if="searching"><b-col class="col-sm-auto">
        <waiting></waiting>
      </b-col></b-row>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import Waiting from '@/components/misc/Waiting.vue';
import SearchScroll from './components/SearchScroll.vue';
import ScrollService from '@/services/scroll';
import ScrollCard from './components/ScrollCard.vue';
import Scroll from '@/models/scroll';

export default Vue.extend({
  name: 'home',
  components: {
    Waiting,
    SearchScroll,
    ScrollCard,
  },
  data() {
    return {
      scrollService: new ScrollService(this.$store),
      allScrolls: [] as Scroll[],
      searching: false,
    };
  },
  computed: {
  },
  async mounted() {
    this.searching = true;
    try {
      this.allScrolls = await this.scrollService.listScrolls();
    } finally {
      this.searching = false;
    }
  },
});
</script>

<style scoped>
.active-language {
  font-weight: bold;
}
</style>
