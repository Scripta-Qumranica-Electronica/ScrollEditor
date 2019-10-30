<template>
    <div>
        <span
            v-for="si in sign.signInterpretations"
            :key="si.id"
            :class="{ selected: si === selectedSignInterpretation }"
            @click="signInterpretationClicked(si)"
        >{{ si.character || '&nbsp;' }}</span>
    </div>
</template>

<script lang="ts">
import { Component, Prop, Vue, Emit } from 'vue-property-decorator';
import { SignInterpretation, Sign } from '@/models/text';

@Component({
    name: 'text-sign'
})
export default class SignComponent extends Vue {
    @Prop() public sign!: Sign;
    @Prop() public selectedSignInterpretation!: SignInterpretation | null;

    private onSignInterpretationClicked(si: SignInterpretation) {
        this.signInterpretationClicked(si);
    }

    @Emit()
    private signInterpretationClicked(si: SignInterpretation) {
        return si;
    }
}
</script>

<style lang="scss" scoped>
div {
  display: inline;
}

span {
    color: black;
    cursor: default;
}

span.selected {
    color: red;
}
</style>
