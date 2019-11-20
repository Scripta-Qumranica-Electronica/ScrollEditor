<template>
    <div>
        <span
            :class="{ selected: chosenSI === selectedSignInterpretation }"
            @click="signInterpretationClicked(chosenSI)"
        >{{ chosenSI.character || '&nbsp;' }}</span>
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

    // Each sign offers alternative readings. For now we always show the first suggestion
    private get chosenSI() {
        return this.sign.signInterpretations[0];
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
    font-weight: bold;
    text-shadow: 0 0 2px black;
    transition: 0.6s;
    font-size:17px;
    margin:2px;
}

</style>
