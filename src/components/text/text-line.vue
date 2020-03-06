<template>
    <div class="text-line" :dir="direction">
        <span class="line-name">{{line.lineName}}</span>
        <text-sign
            :selectedSignInterpretation="selectedSignInterpretation"
            v-for="sign in line.signs"
            :key="sign.signId"
            :sign="sign"
            @sign-interpretation-clicked="onSignInterpretationClicked($event)"
        ></text-sign>
    </div>
</template>

<script lang="ts">
import { Component, Prop, Vue, Emit } from 'vue-property-decorator';
import { Line, TextDirection, SignInterpretation } from '@/models/text';
import TextSign from '@/components/text/text-sign.vue';

@Component({
    name: 'text-line',
    components: {
        'text-sign': TextSign
    }
})
export default class TextLineComponent extends Vue {
    @Prop() public line!: Line;
    @Prop({
        default: 'rtl'
    })
    public direction!: TextDirection;
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
div.text-line {
    display: flex;
}

span.line-name {
    padding-left: 10px;
}
</style>
