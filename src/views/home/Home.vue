<template>
  <div>
    <b-row><b-col>
      <search-scroll :disabled="searching"></search-scroll>
    </b-col></b-row>
    <ul class="list-unstyled row mt-5" id="search-results" v-if="!searching">
      <li class="col-sm-6 col-md-4 col-lg-3 list-item" v-for="combination in combinations" :key="combination.versionId">
        <scroll-card :scroll="combination"></scroll-card>
      </li>
    </ul>
    <b-row v-if="searching">
      <waiting></waiting>
    </b-row>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import Waiting from '@/components/misc/Waiting.vue';
import SearchScroll from './components/SearchScroll.vue';
import CombinationSearchService from '@/services/combination-search';
import ScrollCard from './components/ScrollCard.vue';

export default Vue.extend({
  name: 'home',
  components: {
    Waiting,
    SearchScroll,
    ScrollCard,
  },
  data() {
    return {
      combinationSearchService: new CombinationSearchService(this.$store),
      searching: false,
      combinations: [],
    };
  },
  async mounted() {
    this.combinations = await this.combinationSearchService.getAllCombinations();
  },
});
</script>

<style scoped>
.active-language {
  font-weight: bold;
}
</style>
