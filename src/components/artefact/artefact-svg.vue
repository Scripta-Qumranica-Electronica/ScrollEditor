<template>
    <div>
        <svg v-if="loaded"
            :viewBox="`${boundingBox.x} ${boundingBox.y} ${boundingBox.width} ${boundingBox.height}`"
            :width="elementWidth"
            :height="elementHeight"
            xmlns="http://www.w3.org/2000/svg"
            xmlns:xlink="http://www.w3.org/1999/xlink">
            <defs>
                <path
                    :id="`path-${artefact.id}`"
                    :d="artefact.mask.svg"/>
                <clipPath :id="`clip-path-${artefact.id}`">
                    <use stroke="none" fill="none" fill-rule="evenodd" :xlink:href="`#path-${artefact.id}`"></use>
                </clipPath>
            </defs>

            <g :clip-path="`url(#clip-path-${artefact.id})`">
                <slot></slot>
            </g>
        </svg>
    </div>
</template>

<script lang="ts">
import { Component, Prop, mixins, toNative } from 'vue-facing-decorator';
import { IIIFImage } from '@/models/image';
import ArtefactDataMixin from './artefact-data-mixin';

@Component({
    name: 'artefact-svg',
})
class ArtefactSvg extends mixins(ArtefactDataMixin) {
    @Prop({default: 1.3}) public aspectRatio!: number;

    public elementWidth = 0;
    public serverScale = 5;
    public loaded = false;

    get scale(): number {
        if (this.elementWidth && this.masterImageManifest) {
            return this.elementWidth / this.boundingBox.width;
        }

        return 0.05;
    }

    get elementHeight(): number {
        if (this.elementWidth) {
            return this.elementWidth / this.aspectRatio;
        }

        return 100;
    }

    public async mounted() {
        await this.mountedDone;
        this.loaded = true;
        this.updateWidth();
        window.addEventListener('resize', () => {
            this.updateWidth();
        });
    }

    public updateWidth() {
        this.elementWidth = this.$el.clientWidth;
        if (!this.loaded) {
            // This should never happen
            console.warn('updateWidth called before data was loaded, which makes very little sense');
            this.serverScale = 5;
            return;
        }

        if (this.imageStack) {
            this.serverScale = this.imageStack!.master.getOptimizedScaleFactor(this.elementWidth,
                this.elementWidth / this.aspectRatio,
                this.boundingBox);
        }
    }
}

export default toNative(ArtefactSvg);
</script>

<style lang="scss" scoped>
svg{
    padding: 20px;
}
</style>
