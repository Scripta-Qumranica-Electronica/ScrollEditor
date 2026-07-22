 <template>
    <div id="resize-bar" @mousedown="startDrag()"></div>
</template>

<script lang="ts">
import { Component, Prop, Vue, toNative } from 'vue-facing-decorator';

@Component({
    name: 'resizeBar',
})
class ResizeBar extends Vue {
    @Prop({
        default: null,
    })
    public gridElement!: HTMLDivElement;

    @Prop() public storageKey!: string;
    public isDragging = false;
    public leftPaneWidth!: number;
    public mounted() {
        if (this.gridElement) {
            const storedLeftPaneWidth = parseFloat(
                localStorage.getItem(this.storageKey) || '70'
            );
            this.setPanelWidths(this.gridElement, storedLeftPaneWidth);
            this.gridElement.onmousemove = (event) => this.onDrag(event);
            this.gridElement.onmouseup = () => this.endDrag();
        }
    }

    public startDrag() {
        this.isDragging = true;
    }

    public endDrag() {
        if (this.isDragging) {
            this.isDragging = false;
            if (this.storageKey) {
                localStorage.setItem(
                    this.storageKey,
                    this.leftPaneWidth.toString()
                );
            }
        }
    }

    public onDrag(event: MouseEvent) {
        if (!this.isDragging) {
            return;
        }
        const grid = this.gridElement as HTMLDivElement;
        this.leftPaneWidth = (event.clientX / grid.clientWidth) * 100;

        this.setPanelWidths(grid, this.leftPaneWidth);
    }

    public setPanelWidths(grid: HTMLDivElement, leftPanelWidth: number) {
        const rightPaneWidth = 100 - leftPanelWidth;
        if (grid) {
            grid.style.setProperty(
                'grid-template-columns',
                `minmax(200px, ${leftPanelWidth}%) 5px minmax(200px, ${rightPaneWidth}%)`
            );
        }
    }
}
export default toNative(ResizeBar);
</script>

<style>
#resize-bar {
    width: 5px;
    grid-column: 2 / 3;
    grid-row: 2 / span 3;
    height: 100%;
    cursor: col-resize;
    z-index: 500;
    background: lightgray;
}
</style>

 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
