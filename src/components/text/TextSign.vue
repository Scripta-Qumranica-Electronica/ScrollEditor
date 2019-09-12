<template>
  <div>
      <div
        v-for="(signInter, index) in sign.signInterpretations"
        :key="index">
        <span :style="{color:CheckColor()}" @click="signClicked()">{{signInter.character}}</span>
        <span v-if="signInter.character===''">&nbsp;</span>
      </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import { Sign, SignInterpretation } from '@/models/text';

export default Vue.extend({
  name: 'text-sign',
  data() {
    return {
      activeColor: '',
      selected: false,
    };
  },
  props: {
    sign: {
        type: Object as () => Sign,
    },
    clickedSignId: Number,
  },
  computed: {
  },
  methods: {
    signClicked() {
       this.activeColor = 'red';
       this.$root.$emit('isClicked', this.sign.signInterpretations[0] as SignInterpretation);
    },
    CheckColor() {
      if (this.sign.signInterpretations[0].signInterpretationId !== this.clickedSignId) {
        return  'black';
      }
      return 'red';
    }
  }
});
</script>

<style lang="scss" scoped>

</style>
