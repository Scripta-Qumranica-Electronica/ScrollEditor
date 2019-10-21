<template>
  <div class="row" :dir="lineDir" v-if="line.signs">
      <text-sign
        :clickedSignId="clickedSignId"
        v-for="(sign, index) in line.signs"
        :key="index"
        :sign="sign"
      ></text-sign>
  </div>
</template>

<script lang="ts">
import Vue, {PropOptions} from 'vue';
import { Line } from '@/models/text';
import TextSign from '@/components/text/TextSign.vue';

export default Vue.extend({
  name: 'text-line',
  components: {
    TextSign
  },
  data() {
    return {
    };
  },
  props: {
    line: Line,
    direction: String,
    clickedSignId: Number,
  },
  computed: {
      lineDir(): string {
          if (this.direction === 'ltr') {
              return 'ltr';
          } else {
              return 'rtl';
          }
      }
  },
  methods: {
  }
});
</script>

<style lang="scss" scoped>

</style>
