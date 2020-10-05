<template>
    <span
        :class="[{ selected: isSelected}, cssStrings]"
        @click="onSignInterpretationClicked($event)"
    >{{ si.character || '&nbsp;' }}</span>
</template>

<script lang="ts">
import { Component, Prop, Vue, Emit } from 'vue-property-decorator';
import { SignInterpretation, Sign } from '@/models/text';

@Component({
    name: 'text-sign',
})
export default class SignComponent extends Vue {
    @Prop() public sign!: Sign;
    // @Prop() public selectedSignInterpretation!: SignInterpretation | null;

    // Each sign offers alternative readings. For now we always show the first suggestion
    private get si() {
        return this.sign.signInterpretations[0];
    }

    private onSignInterpretationClicked(
        event: MouseEvent,
        si: SignInterpretation
    ) {
        if (event.ctrlKey || event.metaKey) {
            this.$state.artefactEditor.toggleSelectSign(this.si);
        } else {
            this.$state.artefactEditor.selectSign(this.si);
        }
    }

    private get isSelected() {
        return this.$state.artefactEditor.isSiSelected(this.si);
    }

    private get cssStrings(): string {
        return this.si.attributes
            .map((x) =>
                `${x.attributeString}-${x.attributeValueString}`
                    .toLowerCase()
                    .replace('_', '-')
            )
            .join(' ');
    }
}
</script>
<style lang="scss" scoped>
@import '@/assets/styles/_variables.scss';
div {
    display: inline;
}

span {
    color: $black;
    cursor: default;
}

span.selected {
    color: $red;
    font-weight: bold;
    text-shadow: 0 0 2px $black;
    transition: 0.6s;
    font-size: 17px;
    margin: 1px;
}

.is-reconstructed-true {
    /* is_reconstructed-true */
    color: #bcbec0;
    user-select: none;
}
.is-reconstructed-true:after {
    content: '\05C4';
    /* Add a dot above the character */
}
.readability-incomplete-but-clear {
    /* readability-incomplete_but_clear */
    color: green;
}
.readability-incomplete-but-clear:after {
    content: '\05C4';
}
.readability-incomplete-and-not-clear:after {
    content: '\05AF';
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
