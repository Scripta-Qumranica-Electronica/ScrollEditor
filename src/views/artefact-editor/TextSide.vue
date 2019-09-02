<template>
  <div id="text-side" :class="{ 'fixed-header': scrolled }">
      <input list="my-list-id" v-model="query" />
       <datalist id="my-list-id">
           <option :key="text" v-for="text in textList">{{ text.name }}</option>
       </datalist>
       <button @click.prevent="search(query)" name="Search">Search</button>
       <pre v-if="textFragment.textFragments && textFragment.textFragments.lines">{{textFragment.textFragments.lines}}</pre>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import { Artefact } from '@/models/artefact';
import TextService from '@/services/text';
import { TextFragmentData } from '../../models/text';

export default Vue.extend({
  name: 'text-side',
  data() {
    return {
      errorMessage: '',
      textService: new TextService(),
      textList: [] as TextFragmentData[],
      query: '',
      textFragmentId: 0,
      textFragment : {},
    };
  },
  props: {
    artefact: Artefact,
  },
  computed: {
    editionId(): number {
      return parseInt(this.$route.params.editionId);
    },
    scrolled(): boolean {
        return true;
    },
  },
  async mounted() {
      this.textService.getEditionText(this.editionId)
      .then((data) => {
          this.textList = data;
      });
  },
  methods: {
      search() {
          console.log(this.query);
          this.textFragmentId = this.textList.find((obj) => obj.name === this.query)!.id;
          this.getFragmentText();

      },
      getFragmentText() {
           this.textService.getTextFragmentId(this.editionId, this.textFragmentId)
            .then((data) => {
                this.textFragment = data;
                console.log('textfragment=', this.textFragment);
            });
      }
  }
});
</script>

<style lang="scss" scoped>
#text-side {
  touch-action: pan-y;
  top: 0;
  right: 0;
}

button {
  margin-right: 10px;
}
.btn-info {
  background-color: #6c757d;
  border-color: #6c757d;
}
</style>
