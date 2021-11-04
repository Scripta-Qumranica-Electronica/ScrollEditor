 <template>
    <div id="resize-bar" @mousedown="startDrag()"></div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';

@Component({
    name: 'resizeBar',
})
export default class ResizeBar extends Vue {
    @Prop({
        default: null,
    })
    protected gridElement!: HTMLElement;
    private isDragging = false;

    public mounted() {
        if (this.gridElement) {
            this.gridElement.onmouseup = () => this.endDrag();
            this.gridElement.onmousemove = (event) => this.onDrag(event);
        }
    }

    public startDrag() {
        this.isDragging = true;
    }

    public endDrag() {
        this.isDragging = false;
    }

    public onDrag(event: MouseEvent) {
        if (!this.isDragging) {
            return;
        }
        const grid = this.gridElement as HTMLDivElement;
        const leftPaneWidth = (event.clientX / grid.clientWidth) * 100;
        const rightPaneWidth = 100 - leftPaneWidth;

        if (grid) {
            grid.style.setProperty(
                'grid-template-columns',
                `minmax(200px, ${leftPaneWidth}%) 5px minmax(200px, ${rightPaneWidth}%)`
            );
        }
    }
}
</script>

<style>
#resize-bar {
    width: 5px;
    grid-column: 2 / 3;
    grid-row: 2 / span 3;
    height: 100%;
    cursor: col-resize;
    z-index: 1000;
    background: lightgray;
}
</style>

 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
