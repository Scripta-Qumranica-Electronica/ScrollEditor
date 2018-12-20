<template>
  <div class="row">
    <div v-if="waiting" class="col">
      <Waiting></Waiting>
    </div>
    <div v-if="!waiting && fragment" class="col">
      <p>Fragment {{ fragment.id }}</p>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import Waiting from '@/components/misc/Waiting.vue';
import FragmentService from '@/services/fragment';
import { Fragment } from '@/models/fragment';

export default Vue.extend({
  name: 'fragment-editor',
  components: {
    Waiting,
  },
  data() {
    return {
      fragmentService: new FragmentService(this.$store),
      waiting: false,
    };
  },
  computed: {
    fragment(): Fragment {
      return this.$store.state.fragment.fragment;
    }
  },
  async mounted() {
    try {
      this.waiting = true;
      await this.fragmentService.fetchFragmentInfo(
        parseInt(this.$route.params.scrollVersionId, 10),
        parseInt(this.$route.params.fragmentId, 10));
    } finally {
      this.waiting = false;
    }
  }
});
</script>