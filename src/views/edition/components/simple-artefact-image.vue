<template>
    <div v-show="loaded">
        <img :src="imageUrl" width="100%" :style="`clip-path: url(#clip-path-${artefact.id};`" />
        <svg width="0" height="0">
            <defs>
                <path :id="`path-${artefact.id}`" v-if="scaledMask" :d="scaledMask"></path>
                <clipPath :id="`clip-path-${artefact.id}`">
                    <use stroke="none" fill="black" fill-rule="evenodd" :href="`#path-${artefact.id}`"></use>
                </clipPath>
            </defs>
        </svg>
    </div>
</template>

<script lang="ts">
import Vue from 'vue';
import { Artefact } from '@/models/artefact';
import { ImageStack } from '@/models/image';
import ArtefactService from '@/services/artefact';
import ImageService from '@/services/image';
import { Polygon } from '@/utils/Polygons';

export default Vue.extend({
    name: 'simple-artefact-image',
    props: {
        artefact: Artefact,
    },
    data() {
        return {
            artefactService: new ArtefactService(),
            imageService: new ImageService(),
            imageStack: undefined as ImageStack | undefined,
            masterImageManifest: undefined as any,
            loaded: false,
            elementWidth: 0,
            serverScale: 5,
        };
    },
    computed: {
        imageUrl(): string {
            if (!this.imageStack) {
                return '';
            }
            return this.imageStack.master.getFullUrl(this.serverScale);
        },
        scale(): number {
            if (this.elementWidth && this.masterImageManifest) {
                return this.elementWidth / this.masterImageManifest.width;
            }

            return 0.05;
        },
        scaledMask(): string {
            // Note - this operation is a bit CPU intensive, we count on Vue's caching mechanism to call it only when
            // scale changes.
            return Polygon.scale(this.artefact.mask.polygon, this.scale).svg;
        },
    },
    async mounted() {
        const imagedObject = await this.artefactService.getArtefactImagedObject(
            this.artefact.editionId!, this.artefact.imagedObjectId);
        this.imageStack = this.artefact.side === 'recto' ? imagedObject.recto : imagedObject.verso;
        if (!this.imageStack) {
            throw new Error(`ImagedObject ${this.artefact.imagedObjectId} doesn't contain the ` +
                            `${this.artefact.side} side even though artefact ${this.artefact.id} references it`);
        }
        await this.imageService.fetchImageManifest(this.imageStack.master);
        this.masterImageManifest = this.imageStack.master.manifest;
        this.loaded = true;

        this.updateWidth();
    },
    methods: {
        updateWidth() {
            this.elementWidth = this.$el.clientWidth;
            if (!this.elementWidth) {
                return;
            }

            if (!this.loaded) {
                console.warn('updateWidth called before data was loaded, which makes very little sense');
                this.serverScale = 5;
                return;
            }

            this.serverScale = this.imageStack!.master.getOptimizedScaleFactor(this.elementWidth);
        }
    },
    watch: {

    }
});
</script>

<style lang="scss" scoped>
</style>
