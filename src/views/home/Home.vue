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
          <small>{{ $tc('home.personalScrollCount', filteredMyScrolls.length) }}</small>
        </div>
      </div>
      <ul class="list-unstyled row mt-2" id="search-results" v-if="filteredMyScrolls.length">
        <li class="col-sm-6 col-md-4 col-lg-3 col-xl-2 mb-3 list-item" v-for="scrollVer in filteredMyScrolls" :key="scrollVer.versionId">
          <scroll-version-card :scrollVer="scrollVer"></scroll-version-card>
        </li>
      </ul>
      <div class="row">
        <div class="col">
          <small>{{ $tc('home.publicScrollCount', filteredAllScrolls.length) }}</small>
        </div>
      </div>
      <ul class="list-unstyled row mt-2" id="search-results" v-if="filteredAllScrolls.length">
        <li class="col-sm-6 col-md-4 col-lg-3 col-xl-2 mb-3 list-item" v-for="scroll in filteredAllScrolls" :key="scroll.id">
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
import ScrollVersionCard from './components/ScrollVersionCard.vue';
import { ScrollInfo, ScrollVersionInfo } from '@/models/scroll';

export default Vue.extend({
  name: 'home',
  components: {
    Waiting,
    ScrollCard,
    ScrollVersionCard,
  },
  data() {
    return {
      scrollService: new ScrollService(this.$store),
      allScrolls: [] as ScrollInfo[],
      myScrolls: [] as ScrollVersionInfo[],
      filter: '',
    };
  },
  computed: {
    filteredMyScrolls() : ScrollVersionInfo[] {
      if (!this.filter) {
        return this.myScrolls;
      }

      return this.myScrolls.filter((scroll) => scroll.name.toLowerCase().startsWith(this.filter.toLowerCase()));
    },
    filteredAllScrolls(): ScrollInfo[] {
      if (!this.filter) {
        return this.allScrolls;
      }

      return this.allScrolls.filter((scroll) => scroll.name.toLowerCase().startsWith(this.filter.toLowerCase()));
    }
  },
  mounted() {
    // We do not use async/await here because we want both requests to go out simultaneously.
    this.scrollService.listScrolls().then((allScrolls) => {
      this.allScrolls = allScrolls;
    }, (error) => {
      throw error;
    });
    this.scrollService.getMyScrollVersions().then((myScrolls) => {
      this.myScrolls = myScrolls;
    }, (error) => {
      throw error;
    });
  },
});
</script>

<style scoped>
.active-language {
  font-weight: bold;
}
</style>
