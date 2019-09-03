<template>
  <div>
      <div
        v-if="textFragment.lines"
        v-for="(line, index) in textFragment.lines"
        :key="index">
        <text-line
            :line="line"
            direction="rtl">
        </text-line>
      </div>
      
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import { TextFragment } from '@/models/text';
import TextLine from '@/components/text/TextLine.vue';


export default Vue.extend({
  name: 'text-fragment',
  components: {
    TextLine
  },
  data() {
    return {
    };
  },
  props: {
    textFragment: TextFragment,
  },
  computed: {
  },
  mounted() {
    //  console.log('textFragments=', this.textFragment)
  },
  methods: {
  }
});
</script>

<style lang="scss" scoped>

</style>
