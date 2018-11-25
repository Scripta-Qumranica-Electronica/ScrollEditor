<template>
  <div class="row">
    <div class="col-sm-12 col-md-10 offset-md-1 col-lg-8 offset-lg-2">
      <b-row><b-col>
        <b-form inline class="mt-2" @submit.prevent="">
            <label for="filter">{{ $t('home.filter') }}:</label>
            <b-form-input v-model="filter" name="filter" class="ml-2"></b-form-input>
        </b-form>
      </b-col></b-row>
      <div class="row">
        <div class="col">
          <small>{{ $tc('home.scrollCount', filteredScrolls.length) }}</small>
        </div>
      </div>
      <ul class="list-unstyled row mt-2" id="search-results" v-if="filteredScrolls.length">
        <li class="col-sm-6 col-md-4 col-lg-3 col-xl-2 mb-3 list-item" v-for="scroll in filteredScrolls" :key="scroll.id">
          <scroll-card :scroll="scroll"></scroll-card>
        </li>
      </ul>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import Waiting from '@/components/misc/Waiting.vue';
import ScrollService from '@/services/scroll';
import ScrollCard from './components/ScrollCard.vue';
import { ScrollInfo } from '@/models/scroll';

export default Vue.extend({
  name: 'home',
  components: {
    Waiting,
    ScrollCard,
  },
  data() {
    return {
      scrollService: new ScrollService(this.$store),
      allScrolls: [] as ScrollInfo[],
      filter: '',
    };
  },
  computed: {
    filteredScrolls(): ScrollInfo[] {
      if (!this.filter) {
        return this.allScrolls;
      }

      return this.allScrolls.filter((scroll) => scroll.name.toLowerCase().startsWith(this.filter.toLowerCase()));
    }
  },
  async mounted() {
    this.allScrolls = await this.scrollService.listScrolls();
  },
});
</script>

<style scoped>
.active-language {
  font-weight: bold;
}
</style>
