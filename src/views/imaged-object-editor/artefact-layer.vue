<template>
    <g class="drawer">
        <path
            :d="polygon.svg"
            :class="{ selected, editable }"
            :style="additionalStyle"
            vector-effect="non-scaling-stroke"
        />
    </g>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import { Artefact } from '@/models/artefact';

@Component({
    name: 'artefact-layer',
})
export default class ArtefactLayer extends Vue {
    @Prop() public readonly artefact!: Artefact;
    @Prop() public readonly color!: string;
    @Prop() public readonly editable!: boolean;
    @Prop() public readonly selected!: boolean;

    private get additionalStyle() {
        return `stroke: ${this.color}; fill: ${this.color}`;
    }

    private get polygon() {
        return this.artefact.mask;
    }
}
</script>

<style lang="scss" scoped>
svg {
    max-height: initial;
}

path {
    stroke-width: 1;
    fill-opacity: 0.2;
}

path.selected {
    stroke-width: 2;
    fill-opacity: 0.4;
    stroke: skyblue !important;
    animation: pulsate 3s ease-out;
    animation-iteration-count: infinite;
}

@keyframes pulsate {
  0% {
    stroke-opacity: 0.4;
  }
  50% {
    stroke-opacity: 1;
  }
  100% {
    stroke-opacity: 0.4;
  }
}

</style>
