<template>
  <div>
      <div
        v-for="(signInter, index) in sign.signInterpretations"
        :key="index">
        <label>{{signInter.character}}</label>
      </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import { Sign } from '@/models/text';

export default Vue.extend({
  name: 'text-line',
  data() {
    return {

    };
  },
  props: {
    sign: {
        type: Object as () => Sign,
    }
  },
  computed: {
  },
  methods: {
  }
});
</script>

<style lang="scss" scoped>

</style>
