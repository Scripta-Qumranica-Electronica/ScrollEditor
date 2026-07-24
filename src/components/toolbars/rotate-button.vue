<template>
    <toolbar-icon-button
        @click="emitClick"
        @mousedown="onMouseDown"
        @mouseup="onMouseUp"
        @mouseleave="onMouseLeave"
        :title="title"
        :icon="icon">
    </toolbar-icon-button>
</template>

<script lang="ts">
import { Component, Prop, Vue, Emit, toNative } from 'vue-facing-decorator';
import ToolbarIconButton from './toolbar-icon-button.vue';

export type Direction = 'left' | 'right';

@Component({
    name: 'repeat-button',
    components: { 'toolbar-icon-button': ToolbarIconButton }
})
class RepeatButton extends Vue {
    @Prop() public direction!: Direction;
    @Prop({ default: 300 }) public repeatDelay!: number;
    public pressed = false;
    public timer?: number;

    public mounted() {
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

    public onMouseDown() {
        if (this.pressed) {
            console.warn('Ignoring handle mouse-down while pressed');
            return;
        }

        // The single (first) rotation now comes from @click, which reliably fires
        // through bootstrap-vue-next's BButton; mousedown only drives the
        // press-and-hold REPEAT, so we don't emit immediately here (that would
        // double-rotate on a normal click if native mousedown forwarding revives).
        this.pressed = true;
        this.timer = window.setInterval(() => this.emitClick(), this.repeatDelay);
    }

    public onMouseUp() {
        this.stopRepeat();
    }

    public onMouseLeave() {
        this.stopRepeat();
    }

    public stopRepeat() {
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
    public emitClick() {
        // Emits the click event, with no arguments at all
    }

}
export default toNative(RepeatButton);
</script>
