<template>
    <div class="sign-wheel" :dir="direction">
        <text-sign
            v-for="signInfo in signs"
            :class="signInfo.class"
            :key="signInfo.sign.signId"
            :sign="signInfo.sign"
            @sign-interpretation-clicked="onSignInterpretationClicked($event)"
        ></text-sign>
    </div>
</template>

<script lang="ts">
import { Component, Prop, Vue, Emit, Watch } from 'vue-property-decorator';
import { Artefact } from '@/models/artefact';
import { Line, SignInterpretation, TextDirection, Sign } from '@/models/text';
import TextSign from '@/components/text/text-sign.vue';

interface SignInfo {
    sign: Sign;
    index: number;
    class: string;
}

@Component({
    name: 'sign-wheel',
    components: {
        'text-sign': TextSign
    }
})
export default class SignWheel extends Vue {
    @Prop() public line!: Line;
    @Prop({
        default: 'rtl'
    })
    public direction!: TextDirection;
    @Prop() public selectedSignInterpretation!: SignInterpretation;
    @Prop({
        default: 3,
    })
    public signsOnEachSide!: number;

    private signs: SignInfo[] = [];
    private selectedIndex = 0;

    public mounted() {
        this.fillWheel();
    }

    private onSignInterpretationClicked(si: SignInterpretation) {
        this.signInterpretationClicked(si);
    }

    @Emit()
    private signInterpretationClicked(si: SignInterpretation) {
        return si;
    }

    @Watch('selectedSignInterpretation')
    private onSelectedSignInterpretationChanged(curSign: SignInterpretation, oldSign: SignInterpretation) {
        this.fillWheel();
    }

    private fillWheel() {
        debugger;
        this.selectedIndex = this.findSignIndex();

        const firstIndex = Math.max(this.selectedIndex - this.signsOnEachSide, 0);
        const lastIndex = Math.min(this.selectedIndex + this.signsOnEachSide,
                                   this.line.signs.length - 1);

        this.signs = [];
        for (let i = firstIndex; i <= lastIndex; i++) {
            const diff = Math.abs(i - this.selectedIndex);
            const si = {
                sign: this.line.signs[i],
                index: i,
                class: `sign-dist-${diff}`,
            };
            this.signs.push(si);
        }
    }

    private findSignIndex() {
        if (!this.selectedSignInterpretation) {
            return -1;
        }

        // Returns the index of the currently selected sign in the line
        for (let i = 0; i < this.line.signs.length; i++) {
            const sign = this.line.signs[i];
            const siIndex = sign.signInterpretations.findIndex(si => si.id === this.selectedSignInterpretation.id);
            if (siIndex !== -1) {
                return i;
            }
        }

        return -1;
    }
}
</script>

<style lang="scss" scoped>
#text-side {
    margin: 20px 50px 20px 30px;
    touch-action: pan-y;
    // top: 0;
    // right: 0;
}

button {
    margin-right: 10px;
}
.btn-info {
    background-color: #6c757d;
    border-color: #6c757d;
}

#text-box {
    margin-top: 30px;
}

.isa_error {
    color: #d8000c;
}
</style>
