<template>
    <b-form inline class="mt-2" @submit.prevent="search">
        <label for="search">Search For Scroll:</label>
        <b-form-input v-model="searchTerm" name="search" class="ml-2"></b-form-input>
        <b-button type="submit" size="sm" @click="search" variant="primary" class="ml-2" :disabled="isSearchDisabled">
          <font-awesome-icon icon="search"></font-awesome-icon>
        </b-button>
        <div v-if="loggedIn">
          <b-form-checkbox class="ml-3" v-model="searchPublic">Public</b-form-checkbox>
          <b-form-checkbox v-model="searchShared">Shared</b-form-checkbox>
          <b-form-checkbox v-model="searchPrivate">Private</b-form-checkbox>
        </div>
    </b-form>
</template>

<script lang="ts">
import Vue from 'vue';

interface SearchInfo {
  term: string;
  public: boolean;
  private: boolean;
  shared: boolean;
}

export default Vue.extend({
  name: 'search-scroll',
  props: {
    disable: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      searchTerm: '',
      searchPublic: true,
      searchShared: true,
      searchPrivate: true,
    };
  },
  computed: {
    isSearchDisabled(): boolean {
      return (!this.searchPublic && !this.searchShared && !this.searchPrivate) || !this.searchTerm;
    },
    loggedIn(): boolean {
      return this.$store.state.session.loggedIn;
    }
  },
  methods: {
    search() {
      const loggedIn = this.$store.state.session.loggedIn();

      const searchInfo: SearchInfo = {
        term: this.searchTerm,
        public: loggedIn ? this.searchPublic : true,
        shared: loggedIn ? this.searchShared : false,
        private: loggedIn ? this.searchPrivate : false,
      };
      this.$emit('searchScroll', searchInfo);
    },
  }
});
</script>

<style lang="scss" scoped>
form {
    width: 100%;
}
</style>
