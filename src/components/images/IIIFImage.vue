<template>
    <g v-if="image" :transform="groupTransform" ref="imageGroup">
        <image
            :xlink:href="backgroundImageUrl"
            :transform="backgroundImageTransform"
            :opacity="opacity"
        />
        <image
            v-for="(tile, idx) in tiles.filter((t) => t.display && t.inView)"
            :key="`iiif-image-${image.id}-tile-${idx}`"
            :xlink:href="tile.url"
            :opacity="opacity"
            :transform="tile.transform"
            @error="retryOnError(tile.url)"
        />
    </g>
</template>

<script lang="ts">
/*
 * This component is responsible for displaying an IIIFImage on an SVG.
 *
 * It takes care of tiling and efficient zooming, but trying to get an optimal scale factor for the server.
 *
 * Understaning the code requires understanding the various coordinate systems we have - as we have a few.
 *
 * 1. SQE coordinate system
 *    This is the coordinate system used by the SQE database. All coordinates and polygons in the database are
 *    expressed in this coordinate system.
 * 2. The Screen coordinate system
 *    This is the coordinate system on the screen - in pixels.
 * 3. The Image coodrinate system
 *    This is the coordinate system of the IIIF Image with no scaling. Usually it is the same as the SQE coordinate
 *    system, but in older images it might not be.
 *
 * Translating a coordinate from one system to another involves multiplying X and Y but a constant factor (identical for X and Y).
 *
 * * SQE Coordinate System to Screen Coordinate System
 *   This is done by multiplying the SQE coordinates by the scaleFactor paramater, which is usually tied up to the Zoom slider on the UI.
 *    Xscreen = Xsqe * scaleFactor; Yscreen = Ysqe * scaleFactor
 *
 * * SQE Coordinate System to Image Coordinate System
 *   SQE assumes the DPI of all the images is 1215. Some images have a different DPI. Translating from one to another involves the image's ppiAdjustmentFactor, which
 *   is sqeDPI / imageDPI. So:
 *
 *   Ximage = Xsqe / image.ppiAdjustmantFactor; Yimage = Ysqe / image.ppiAdjustmentFactor
 */

import { Image } from '@/models/image';
import { BoundingBox, BoundingBoxInterface } from '@/utils/helpers';
import { Component, Prop, Vue, Watch } from 'vue-property-decorator';

interface ManifestTileInfo {
    width: number;
    height: number;
    scaleFactors: number[];
}

interface TileInfo {
    url: string;
    transform: string;
    display: boolean;
    inView: boolean;
    retries: number;
}

@Component({
    name: 'iiif-image',
})
export default class IIIFImageComponent extends Vue {
    @Prop() private image!: Image;
    @Prop() private boundingBox?: BoundingBoxInterface; // In SQE coordinates
    @Prop({ default: 0.5 }) private scaleFactor!: number;
    @Prop() private maxWidth?: number; // In Screen Coordinates
    @Prop({ default: 1 }) private opacity!: number;

    private retryLimit = 10;
    private tiles: TileInfo[] = [];
    private observer?: ResizeObserver;

    protected get surroundingDiv() {
        const imageGroup = this.$refs.imageGroup as SVGGElement;
        const svg = imageGroup.ownerSVGElement!;
        const div = svg.closest('div')!;

        return div;
    }

    public mounted() {
        const div = this.surroundingDiv;
        div.addEventListener('scroll', () => { this.onSurroundingScroll(); });
        this.observer = new ResizeObserver(() => this.onSurroundingResize());
        this.observer!.observe(div);

        this.loadTiles();
        // this.scaleFactor = 0;
        // this.scaleFactor = this.scaleFactor;
    }

    public destroyed() {
        const div = this.surroundingDiv;
        div.removeEventListener('scroll', () => { this.onSurroundingScroll(); });
        if (this.observer) {
            this.observer.disconnect();
        }
    }

    private onSurroundingScroll() {
        console.debug('Surrounding scrolled');
    }

    private onSurroundingResize() {
        console.debug('Surrounding resize');
    }

    @Watch('scaleFactor')
    private onScalePropertyChanged(value: number, oldValue: number) {
        this.loadTiles();
    }

    @Watch('boundingBox')
    private onBoundingBoxPropertyChanged(value: number, oldValue: number) {
        // Sometimes loading of the bounding box lags behind reception of
        // other values, make sure to trigger a tile load when a new bounding
        // box appears.
        this.loadTiles();
    }

    private loadTiles() {
        // If the bounding box has no width or height, don't go any further; nothing to display
        if (!this.imageBoundingBox.width || !this.imageBoundingBox.height || !this.image) {
            return;
        }

        // Get the tile size we can actually use (this is based on the optimizedImageScaleFactor)
        const tileWidth = Math.floor(
            this.manifestTileInfo.width / this.optimizedImageScaleFactor
        );
        const tileHeight = Math.floor(
            this.manifestTileInfo.height / this.optimizedImageScaleFactor
        );
        // console.debug(`tile size ${tileWidth}, ${tileHeight}`);

        this.tiles = [];
        const endX = this.imageBoundingBox.x + this.imageBoundingBox.width; // Bottom right corner of the bounding box
        const endY = this.imageBoundingBox.y + this.imageBoundingBox.height;
        // console.debug('imageBoundingBox: ', this.imageBoundingBox);

        let xTranslate = 0; // How much to translate the tile
        for (let x = this.imageBoundingBox.x; x < endX; x += tileWidth) {
            const currentTileWidth = Math.min(tileWidth, endX - x);

            let yTranslate = 0;
            for (let y = this.imageBoundingBox.y; y < endY; y += tileHeight) {
                const currentTileHeight = Math.min(tileHeight, endY - y);

                // Now we have a tile we can create
                const url = this.image.getScaledAndCroppedUrl(
                    this.optimizedImageScaleFactor * 100,
                    x,
                    y,
                    currentTileWidth + 1,
                    currentTileHeight + 1
                );
                const tile = {
                    url,
                    transform: `translate(${xTranslate}, ${yTranslate})`,
                    width: currentTileWidth * this.optimizedImageScaleFactor,
                    height: currentTileHeight * this.optimizedImageScaleFactor,
                    display: true,
                    inView: true,
                    retries: 0,
                };
                // console.debug(`tile (${x}, ${y}, ${currentTileWidth}, ${currentTileHeight})`);
                this.tiles.push(tile);
                yTranslate +=
                    currentTileHeight * this.optimizedImageScaleFactor; // For some reason without the -1 we see thin lines between tiles
            }
            xTranslate += currentTileWidth * this.optimizedImageScaleFactor;
        }
    }

    // The actual bounding box - either the supplied bounding box argument or the entire image
    // in SQE coordinates
    private get sqeBoundingBox(): BoundingBoxInterface {
        if (this.boundingBox) {
            return this.boundingBox;
        }

        const sqeBB = new BoundingBox(
            0,
            0,
            this.image.width,
            this.image.height
        );
        return sqeBB;
    }

    // Bounding box in Image Coordinates
    private get imageBoundingBox(): BoundingBoxInterface {
        const sqeBB = this.sqeBoundingBox;
        const f = this.image.ppiAdjustmentFactor;

        const imageBB = new BoundingBox(
            sqeBB.x / f,
            sqeBB.y / f,
            sqeBB.width / f,
            sqeBB.height / f
        );
        return imageBB;
    }

    // Screen bounding box - in Screen Coordinates
    private get screenBoundingBox(): BoundingBoxInterface {
        const sqeBB = this.sqeBoundingBox;
        let f;

        if (this.maxWidth) {
            f = sqeBB.width / this.maxWidth;
        } else {
            f = 1 / this.scaleFactor;
        }

        const screenBB = new BoundingBox(
            sqeBB.x / f,
            sqeBB.y / f,
            sqeBB.width / f,
            sqeBB.height / f
        );
        return screenBB;
    }

    // The IIIF manifest can contain tile information. If not, we have a default tile information we use.
    private get manifestTileInfo(): ManifestTileInfo {
        if (this.image.manifest?.tiles) {
            // Use the first tile - we haven't seen an example with more than one tile entry
            return this.image.manifest.tiles[0] as ManifestTileInfo;
        }

        // Default tile information
        return {
            width: 1024,
            height: 1024,
            scaleFactors: [1, 2, 4],
        };
    }

    // The amount of scale required for the image
    // imageCoordinate * imageScaleFactor = screenCoordinate
    //
    // This scale factor is the basis of what is sent to the server
    private get imageScaleFactor(): number {
        const imageScaleFactor = Math.min(
            this.screenBoundingBox.width / this.imageBoundingBox.width,
            1
        );
        return imageScaleFactor;
    }

    // The imageScaleFactor rounded up to the nearest scale optimized in the server
    // (based on the tile info)
    private get optimizedImageScaleFactor() {
        for (
            let i = this.manifestTileInfo.scaleFactors.length - 1;
            i >= 0;
            i--
        ) {
            const manifestScaleFactor =
                1 / this.manifestTileInfo.scaleFactors[i];
            if (manifestScaleFactor > this.imageScaleFactor) {
                return manifestScaleFactor;
            }
        }

        return 1; // If all fails, return 1
    }

    // // Returns the tiles necessary for the laying out the original image.
    // // We need to lay out tiles to cover the entire imageBoundingBox.
    // private get tiles(): TileInfo[] {
    //     // Get the tile size we can actually use (this is based on the optimizedImageScaleFactor)
    //     const tileWidth = Math.floor(this.manifestTileInfo.width / this.optimizedImageScaleFactor);
    //     const tileHeight = Math.floor(this.manifestTileInfo.height / this.optimizedImageScaleFactor);
    //     // console.debug(`tile size ${tileWidth}, ${tileHeight}`);

    //     const tiles: TileInfo[] = [];
    //     const endX = this.imageBoundingBox.x + this.imageBoundingBox.width;   // Bottom right corner of the bounding box
    //     const endY = this.imageBoundingBox.y + this.imageBoundingBox.height;
    //     // console.debug('imageBoundingBox: ', this.imageBoundingBox);

    //     let xTranslate = 0;  // How much to translate the tile
    //     for (let x = this.imageBoundingBox.x; x < endX; x += tileWidth) {
    //         const currentTileWidth = Math.min(tileWidth, endX - x);

    //         let yTranslate = 0;
    //         for (let y = this.imageBoundingBox.y; y < endY; y += tileHeight) {
    //             const currentTileHeight = Math.min(tileHeight, endY - y);

    //             // Now we have a tile we can create
    //             const url = this.image.getScaledAndCroppedUrl(this.optimizedImageScaleFactor * 100,
    //                                                        x, y, currentTileWidth, currentTileHeight);
    //             const tile = {
    //                 url: url,
    //                 transform: `translate(${xTranslate}, ${yTranslate})`,
    //                 width: currentTileWidth * this.optimizedImageScaleFactor,
    //                 height: currentTileHeight * this.optimizedImageScaleFactor
    //             };
    //             // console.debug(`tile (${x}, ${y}, ${currentTileWidth}, ${currentTileHeight})`);
    //             tiles.push(tile);
    //             this.goodLinks[url] = true
    //             yTranslate += currentTileHeight * this.optimizedImageScaleFactor; // For some reason without the -1 we see thin lines between tiles
    //         }
    //         xTranslate += currentTileWidth * this.optimizedImageScaleFactor;
    //     }

    //     return tiles;
    // }

    // A low-res background image placed behind the tiles, to fill out any rounding artefacts between tiles
    private get backgroundImageUrl(): string {
        return this.image.getScaledAndCroppedUrl(
            5,
            this.imageBoundingBox.x,
            this.imageBoundingBox.y,
            this.imageBoundingBox.width,
            this.imageBoundingBox.height
        );
    }

    private get backgroundImageTransform(): string {
        return 'scale(20)';
    }

    private get groupTransform(): string {
        // Scale the images back to sqe coordinates.
        // The images are in imageCoordinates * optimizedImageScaleFactor,
        const optimizedImageToSqe =
            this.image.ppiAdjustmentFactor / this.optimizedImageScaleFactor;
        const scaleTransform = `scale(${optimizedImageToSqe})`;

        // The image is now in sqe coordinates, but at (0, 0) and not the bounding box. We need to move it.
        const translateTransform = `translate(${this.sqeBoundingBox.x}, ${this.sqeBoundingBox.y})`;

        return translateTransform + ' ' + scaleTransform;
    }

    private retryOnError(url: string): void {
        // Note: this is called when an images faills to load (maybe a 500 error)
        // We want to try loading again, so we set the display value for the object
        // to false and update by removing and readding it to this.tiles (perhaps it
        // could be done with Vue.set).  Then we set a timer for it to turn display
        // back to true (and we wait a little longer each iteration until success or
        // we hit the retry limit).
        // Note that I tried earlier to just get the actual <image> DOM element
        // and to reset the xlink:href attribute, but that didn't seem to trigger
        // an attempt to reload the image.  Doing it the vue way seems to work fine.
        let retry = 1;
        this.tiles = this.tiles.map((x) => {
            if (x.url === url) {
                x.display = false;
                retry = x.retries;
            }
            return x;
        });

        if (retry < this.retryLimit) {
            // Give the server a little breathing room to try again
            // by backing off a little more on each retry of a single image.
            setTimeout(() => {
                this.tiles = this.tiles.map((x) => {
                    if (x.url === url) {
                        x.display = true;
                        x.retries += 1;
                    }
                    return x;
                });
            }, 20 * retry);
            return;
        }

        // This is apparently an error that cannot be recovered.
        // How should it be handled? Maybe alert the user?
        console.error(`After ${retry} attempts, could not fetch image: ${url}`);
    }
}
</script>

<style lang="scss" scoped>
</style>
