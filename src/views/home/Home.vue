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
import CombinationService from '@/services/combinations';
import ScrollCard from './components/ScrollCard.vue';
import Combination from '@/models/combination';
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
      combinationsService: new CombinationService(this.$store),
      searching: false,
    };
  },
  computed: {
    privateCombinations(): Combination[] {
      return this.$store.state.allScrollsState.combinations.filter((comb: Combination) => !comb.public);
    }
  },
  async mounted() {
    this.combinationsService.fetchAllCombinations();
  },
});
</script>

<style scoped>
.active-language {
  font-weight: bold;
}
</style>
