<template>
  <div class="col-sm-12 col-md-10 offset-md-1 col-lg-8 offset-lg-2">
    <b-row><b-col>
      <b-form inline class="mt-2" @submit.prevent="">
          <label for="filter">{{ $t('home.filter') }}:</label>
          <b-form-input v-model="filter" name="filter" class="ml-2"></b-form-input>
      </b-form>
    </b-col></b-row>
    <div class="row">
      <div class="col">
        <small>{{ $tc('home.personalEditionGroupCount', numberOfMyEditions)}}</small>
      </div>
    </div>
    <ul class="list-unstyled row mt-2" id="my-search-results" v-if="myEditions.length">
      <li
          class="col-sm-6 col-md-4 col-lg-3 col-xl-2 mb-3 list-item"
          v-for="edition in myEditions"
          v-show="filter === '' || edition.name.toLowerCase().indexOf(filter.toLowerCase()) !== -1"
          :key="edition.versionId">
        <edition-card :edition="edition"></edition-card>
      </li>
    </ul>
    <div class="row">
      <div class="col">
        <small>{{ $tc('home.publicEditionGroupCount', numberOfEditions)}}</small>
      </div>
    </div>
    <ul class="list-unstyled row mt-2" id="all-search-results" v-if="publicEditions.length">
      <li
          class="col-sm-6 col-md-4 col-lg-3 col-xl-2 mb-3 list-item"
          v-for="edition in publicEditions"
          v-show="filter === '' || edition.name.toLowerCase().indexOf(filter.toLowerCase()) !== -1"
          :key="edition.id">
        <edition-group-card :edition="edition"></edition-group-card>
      </li>
    </ul>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import Waiting from '@/components/misc/Waiting.vue';
import EditionGroupCard from './components/EditionGroupCard.vue';
import EditionCard from './components/EditionCard.vue';
import { EditionInfo } from '@/models/edition';
import { countIf } from '@/utils/helpers';

export default Vue.extend({
  name: 'home',
  components: {
    Waiting,
    EditionGroupCard,
    EditionCard,
  },
  data() {
    return {
      filter: '',
    };
  },
  computed: {
    publicEditions(): EditionInfo[] {
      return this.$state.editions.items.filter((ed) => ed.isPublic);
    },
    myEditions(): EditionInfo[] {
      return this.$state.editions.items.filter((ed) => ed.mine);
    },
    numberOfEditions(): number {
      return countIf(this.publicEditions, (edition) => this.nameMatch(edition.name));
    },
    numberOfMyEditions(): number {
      return countIf(this.myEditions, (edition) => this.nameMatch(edition.name));
    },
  },
  created() {
    this.$state.prepare.allEditions();
  },
  methods: {
      nameMatch(name: string): boolean {
          return name.toLowerCase().indexOf(this.filter.toLowerCase()) !== -1;
      }
  }
});
</script>

<style scoped>

.active-language {
  font-weight: bold;
}

ul#my-search-results, 
ul#all-search-results {  
    height: calc(50vh - 95px);
    overflow: auto
}

</style>
