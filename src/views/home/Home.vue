<template>
  <div>
    <b-row><b-col>
      <search-scroll :disabled="searching"></search-scroll>
    </b-col></b-row>
    <b-row>
      <ul class="list-unstyled" id="search-results" v-if="!searching">
        <li class="col-sm-6 col-md-4 col-lg-3 list-item" v-for="scroll in scrolls" :key="scroll.name">
          <scroll-card :scroll="scroll"></scroll-card>
        </li>
      </ul>
    </b-row>
    <b-row v-if="searching">
      <waiting></waiting>
    </b-row>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import Waiting from '@/components/misc/Waiting.vue';
import SearchScroll from './components/SearchScroll.vue';

export default Vue.extend({
  name: 'home',
  components: {
    Waiting,
    SearchScroll,
  },
  data() {
    return {
      searching: false,
      scrolls: [],
    };
  },
  mounted() {
    // Load a randomized selection of scrolls for the first display
  },
});
</script>

<style scoped>
.active-language {
  font-weight: bold;
}
</style>
