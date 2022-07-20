<template>
    <toolbar-icon-button
        @mousedown="onMouseDown"
        @mouseup="onMouseUp"
        @mouseleave="onMouseLeave"
        :title="title"
        :icon="icon">
    </toolbar-icon-button>
</template>

<script lang="ts">
import { Component, Prop, Model, Vue, Emit } from 'vue-property-decorator';
import ToolbarIconButton from './toolbar-icon-button.vue';

export type Direction = 'left' | 'right';

@Component({
    name: 'repeat-button',
    components: { 'toolbar-icon-button': ToolbarIconButton }
})
export default class RepeatButton extends Vue {
    @Prop() private direction!: Direction;
    @Prop({ default: 300 }) private repeatDelay!: number;
    private pressed = false;
    private timer?: number;

    protected mounted() {
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

    protected onMouseDown() {
        if (this.pressed) {
            console.warn('Ignoring handle mouse-down while pressed');
            return;
        }

        this.pressed = true;
        this.timer = window.setInterval(() => this.emitClick(), this.repeatDelay);
        this.emitClick();
    }

    protected onMouseUp() {
        this.stopRepeat();
    }

    protected onMouseLeave() {
        this.stopRepeat();
    }

    protected stopRepeat() {
        if (!this.pressed) {
            // This sometimes happens when the browser window is brought to focus - the mouse up event is fired
            // without a mouse down. No need to do anything here.
            return;
        }

        this.pressed = false;
        window.clearInterval(this.timer);
        this.timer = undefined;
    }

    @Emit('click')
    private emitClick() {
        // Emits the click event, with no arguments at all
    }

}
</script>