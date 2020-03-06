<template>
    <span
        :class="[{ selected: chosenSI === selectedSignInterpretation}, cssStrings(chosenSI)]"
        @click="signInterpretationClicked(chosenSI)"
    >{{ chosenSI.character || '&nbsp;' }}</span>
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

    // Each sign offers alternative readings. For now we always show the first suggestion
    private get chosenSI() {
        return this.sign.signInterpretations[0];
    }

    private onSignInterpretationClicked(si: SignInterpretation) {
        if (this.clickable(si)) {
            this.signInterpretationClicked(si);
        }
    }

    @Emit()
    private signInterpretationClicked(si: SignInterpretation) {
        return si;
    }

    private cssStrings(si: SignInterpretation): string {
        return si.attributes.map(x => x.attributeValueString).join(' ');
    }

    private clickable(si: SignInterpretation) {
        if (!si.character) {
            return false;
        }
        if (this.cssStrings(si).indexOf('is-reconstructed-true') !== -1) {
            return false;
        }
        return true;
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
    margin:1px
} 

.is-reconstructed-true {
    color: rgba(0, 0, 0, 0);
    user-select: none;
}
.readability-incomplete-but-clear {
    color: green;
}
.readability-incomplete-but-clear:after {
    content: "\05C4";
}
.readability-incomplete-and-not-clear:after {
    content: "\05AF";
}
.readability-incomplete-and-not-clear {
    color: blue;
}
.relative-position-above-line {
     vertical-align: super;
     font-size: 80%;
}
.relative-position-below-line {
     vertical-align: sub;
     font-size: 80%;
}

</style>
