<template>
  <div id="text-side" :class="{ 'fixed-header': scrolled }">
      <input list="my-list-id" v-model="query" />
       <datalist id="my-list-id">
           <option :key="index" v-for="(text, index) in textList">{{ text.name }}</option>
       </datalist>
       <button @click.prevent="search(query)" name="Search">Search</button>
       
       <div
        v-if="textEdition.textFragments"
        v-for="(fragment, index) in textEdition.textFragments"
        :key="index">
        <text-fragment
            :textFragment="fragment">
        </text-fragment>
       </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import { Artefact } from '@/models/artefact';
import TextService from '@/services/text';
import { TextFragmentData } from '@/models/text';
import TextFragment from '@/components/text/TextFragment.vue';

export default Vue.extend({
  name: 'text-side',
  components: {
    TextFragment
  },
  data() {
    return {
      errorMessage: '',
      textService: new TextService(),
      textList: [] as TextFragmentData[],
      query: '',
      textFragmentId: 0,
      textEdition : {},
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
          this.textFragmentId = this.textList.find((obj) => obj.name === this.query)!.id;
          this.getFragmentText();

      },
      getFragmentText() {
           this.textService.getTextFragmentId(this.editionId, this.textFragmentId)
            .then((data) => {
                this.textEdition = data;
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
