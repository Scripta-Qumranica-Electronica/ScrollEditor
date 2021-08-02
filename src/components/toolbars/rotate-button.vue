<template>
    <b-button
        variant="outline-secondary"
        @mousedown="onMouseDown"
        @mouseup="onMouseUp"
        @mouseleave="onMouseLeave"
        v-b-tooltip.hover.bottom
        :title="title">
        <font-awesome-icon :icon="icon"></font-awesome-icon>
    </b-button>
</template>

<script lang="ts">
import { Component, Prop, Model, Vue, Emit } from 'vue-property-decorator';

export type Direction = 'left' | 'right';

@Component({
    name: 'repeat-button',
})
export default class RepeatButton extends Vue {
    @Prop() private direction!: Direction;
    @Prop({ default: 300 }) private repeatDelay!: number;
    private pressed = false;
    private timer?: number;

    mounted() {
        this.pressed = false;
        this.timer = undefined;
    }

    get title(): string {
        if (this.direction === 'left') {
            return this.$t('misc.leftRotate').toString();
        } else {
            return this.$t('misc.rightRotate').toString();
        }
    }

    get icon(): string {
        if (this.direction === 'left') {
            return 'undo';
        } else {
            return 'redo';
        }
    }

    onMouseDown() {
        if (this.pressed) {
            console.warn("Ignoring handle mouse-down while pressed!");
            return;
        }

        this.pressed = true;
        this.timer = window.setInterval(() => this.emitClick(), this.repeatDelay);
        this.emitClick();
    }

    onMouseUp() {
        this.stopRepeat();
    }

    onMouseLeave() {
        this.stopRepeat();
    }

    stopRepeat() {
        if(!this.pressed) {
            console.warn("Can't stop repeating of not pressed");
        }

        this.pressed = false;
        window.clearInterval(this.timer);
        this.timer = undefined;
    }
    
    @Emit('click')
    emitClick() {
        // Emits the click event, with no arguments at all
    }

}
</script>