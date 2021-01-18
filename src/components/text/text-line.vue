<template>
    <div class="text-line" :dir="direction">
        <span @click="showParallels()" class="line-name">{{line.lineName}}</span>
        <text-sign :withMenu="true" :id="'popover-si-' + sign.signInterpretations[0].signInterpretationId" v-for="sign in line.signs" :key="sign.signInterpretations[0].signInterpretationId" :sign="sign"></text-sign>
        <b-modal :ref="`parallel-line-${line.lineId}`" hide-footer title="Parallel Texts from QWB">
          <b @click="showParallels()" class="line-name">Line {{line.lineName}}</b>
          <div class="text-line" :dir="direction">
            <text-sign :withMenu="true" :id="'popover-si-' + sign.signInterpretations[0].signInterpretationId" v-for="sign in line.signs" :key="sign.signInterpretations[0].signInterpretationId" :sign="sign"></text-sign>
          </div>
          <hr>
          <div v-if="parallels !== null && parallels.parallels.length > 0">
            <div v-for="parallel in parallels.parallels">
              <b>{{parallel.qwbTextReference}}</b>
              <p><span v-for="word in parallel.parallelWords" class="qwb-parallel-word">{{word.word}}</span></p>
            </div>
          </div>
          <div v-if="parallels === null || parallels.parallels.length === 0">
            <p>No parallel text found in the QWB database.</p>
          </div>
        </b-modal>
    </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import { Line, TextDirection } from '@/models/text';
import TextSign from '@/components/text/text-sign.vue';
import { QwbParallelListDTO } from '@/dtos/sqe-dtos';
import QwbProxyService from '@/services/qwb-proxy';

@Component({
    name: 'text-line',
    components: {
        'text-sign': TextSign,
    },
})
export default class TextLineComponent extends Vue {
    @Prop() public line!: Line;
    @Prop({
        default: 'rtl',
    })
    public direction!: TextDirection;
    private parallels: QwbParallelListDTO | null = null;

    private async showParallels() {
      if (this.parallels === null) {
        const qwbWordIds = this.line.signs.flatMap(x => x.signInterpretations.flatMap(y => y.qwbWordIds));
        if (qwbWordIds.length > 0) {
          const qwbStartId = qwbWordIds[0]
          const qwbEndId = qwbWordIds[qwbWordIds.length - 1]
          if (qwbStartId !== qwbEndId && qwbStartId !== 0 && qwbEndId !== 0) {
            const qps = new QwbProxyService();
            this.parallels = await qps.getQwbParallelText(qwbStartId, qwbEndId);
            this.$refs[`parallel-line-${this.line.lineId}`].show()
          }
        }
      }
    }
}
</script>
<style lang="scss" scoped>
div.text-line {
  display: table;
    text-align: right;
    white-space: nowrap;
}

span.line-name {
    padding-left: 10px;
}

span.qwb-parallel-word {
  margin-right: 0.5em;
}
</style>
