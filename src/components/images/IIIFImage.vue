<template>
    <g v-if="image" :transform="groupTransform" ref="imageGroup">
        <image
            :xlink:href="backgroundImageUrl"
            :transform="backgroundImageTransform"
            :opacity="opacity"
            @error="onBackgroundLoadError()"
        />
        <image
            v-for="(tile, idx) in tiles"
            :key="`iiif-image-${image.id}-tile-${idx}`"
            :id="`iiif-image-${image.id}-tile-${idx}`"
            :width="tile.width"
            :height="tile.height"
            :xlink:href="tile.url"
            :opacity="opacity"
            :transform="tile.transform"
            @error="tile.onLoadError()"
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
import { Polygon } from '@/utils/Polygons';
import { Component, Prop, Vue, Watch } from 'vue-property-decorator';

interface ManifestTileInfo {
    width: number;
    height: number;
    scaleFactors: number[];
}

type Ring = number[][]; // [[x,y], ...] in SQE coordinates
interface Rect { x0: number; y0: number; x1: number; y1: number; }

// Parse a Polygon's SVG path ("M x y L x y ... [M ...]") into rings of [x,y] points.
function parseRings(svg: string): Ring[] {
    const rings: Ring[] = [];
    for (const sub of (svg || '').split('M')) {
        if (!sub.trim()) continue;
        const nums = sub.match(/-?\d+(?:\.\d+)?/g);
        if (!nums || nums.length < 6) continue; // need >= 3 points
        const ring: Ring = [];
        for (let i = 0; i + 1 < nums.length; i += 2) ring.push([+nums[i], +nums[i + 1]]);
        rings.push(ring);
    }
    return rings;
}

function pointInRings(px: number, py: number, rings: Ring[]): boolean {
    let inside = false;
    for (const ring of rings) {
        for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
            const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
            if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
        }
    }
    return inside;
}

function segsCross(ax: number, ay: number, bx: number, by: number, cx: number, cy: number, dx: number, dy: number): boolean {
    const d1 = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    const d2 = (bx - ax) * (dy - ay) - (by - ay) * (dx - ax);
    const d3 = (dx - cx) * (ay - cy) - (dy - cy) * (ax - cx);
    const d4 = (dx - cx) * (by - cy) - (dy - cy) * (bx - cx);
    return ((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0));
}

// Does the axis-aligned rect intersect the mask (rings)? Conservative: never rejects a tile that
// has any mask pixel in it (checks vertices-in-rect, rect-corners-in-mask, and edge crossings).
function rectIntersectsRings(r: Rect, rings: Ring[]): boolean {
    for (const ring of rings) {
        for (const [x, y] of ring) {
            if (x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1) return true;
        }
    }
    if (pointInRings(r.x0, r.y0, rings) || pointInRings(r.x1, r.y0, rings) ||
        pointInRings(r.x1, r.y1, rings) || pointInRings(r.x0, r.y1, rings)) return true;
    const rc = [[r.x0, r.y0], [r.x1, r.y0], [r.x1, r.y1], [r.x0, r.y1]];
    for (const ring of rings) {
        for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
            for (let k = 0; k < 4; k++) {
                const a = rc[k], b = rc[(k + 1) % 4];
                if (segsCross(ring[j][0], ring[j][1], ring[i][0], ring[i][1], a[0], a[1], b[0], b[1])) return true;
            }
        }
    }
    return false;
}

class TileInfo {
    private static RETRY_LIMIT = 10;

    public transform: string;
    public loadError: boolean;
    private _inView: boolean;
    public retries: number;
    public width: number;
    public height: number;
    private _url: string;
    public get url() {
        return this.inView && !this.loadError ? this._url : null;
    }

    public get inView() {
        return this._inView;
    }

    public set inView(val: boolean) {
        // Non-sticky: tiles that leave the viewport (+ prebuffer) are unloaded so only the
        // visible region stays resident. Re-entering tiles reload from the browser cache.
        this._inView = val;
    }

    public constructor(
        url: string,
        transform: string,
        width: number,
        height: number
    ) {
        this.transform = transform;
        this._url = url;
        this.width = width;
        this.height = height;
        this.loadError = false;
        this.retries = 0;
        this._inView = false;
    }

    public onLoadError() {
        this.loadError = true;
        this.retries += 1;
        if (this.retries >= TileInfo.RETRY_LIMIT) {
            console.error(
                `Giving up loading ${this._url} after ${this.retries}`
            );
        }
        setTimeout(() => {
            this.loadError = false;
        }, 50 * this.retries); // Try again after a little while (wait longer after more retries)
    }
}

@Component({
    name: 'iiif-image',
})
export default class IIIFImageComponent extends Vue {
    @Prop() public image!: Image;
    @Prop() public boundingBox?: BoundingBoxInterface; // In SQE coordinates
    @Prop({ default: 0.5 }) public scaleFactor!: number;
    @Prop() public maxWidth?: number; // In Screen Coordinates
    @Prop({ default: 1 }) public opacity!: number;
    @Prop({ default: true }) public dynamic!: boolean;
    @Prop() public mask?: Polygon; // artefact clip mask (SQE coords); tiles fully outside it are skipped

    public tiles: TileInfo[] = [];
    private _maskRingsCache: { svg: string; rings: Ring[] } | null = null;

    // Mask polygon parsed into rings (SQE coords), cached by its svg string. null = no usable mask.
    private get maskRings(): Ring[] | null {
        if (!this.mask) return null;
        const svg = this.mask.svg;
        if (!this._maskRingsCache || this._maskRingsCache.svg !== svg) {
            this._maskRingsCache = { svg, rings: parseRings(svg) };
        }
        return this._maskRingsCache.rings.length ? this._maskRingsCache.rings : null;
    }
    private observer?: ResizeObserver;
    private refreshTimeoutId: number | null = null;
    private backgroundLoadError = false;

    private static CHECK_IN_VIEW_TIMEOUT = 50; // Update tiles in view 50ms after scroll or resize
    private static PREBUFFER = 0.5; // load tiles within half a viewport beyond each edge (prebuffer)
    private static MASK_FILTER_MAX_COST = 200000; // #tiles * #maskPoints cap; above it, skip the mask filter

    protected get surroundingDiv() {
        const imageGroup = this.$refs.imageGroup as SVGGElement;
        const svg = imageGroup.ownerSVGElement!;
        let div = svg.closest('div.iiif-container');
        if (!div)
        {
            div = svg.closest('div')!;
        }

        return div;
    }

    public mounted() {
        const div = this.surroundingDiv;
        div.addEventListener('scroll', () => {
            this.onSurroundingChanged();
        });
        this.observer = new ResizeObserver(() => this.onSurroundingChanged());
        this.observer!.observe(div);
        this.loadTiles();
        // this.scaleFactor = 0;
        // this.scaleFactor = this.scaleFactor;
    }

    public destroyed() {
        const div = this.surroundingDiv;
        div.removeEventListener('scroll', () => {
            this.onSurroundingChanged();
        });
        if (this.observer) {
            this.observer.disconnect();
        }
    }

    private onSurroundingChanged() {
        if (this.refreshTimeoutId) {
            window.clearTimeout(this.refreshTimeoutId);
        }
        this.refreshTimeoutId = window.setTimeout(() => {
            this.checkTilesInView();
            this.refreshTimeoutId = null;
        }, IIIFImageComponent.CHECK_IN_VIEW_TIMEOUT);
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
        if (
            !this.imageBoundingBox.width ||
            !this.imageBoundingBox.height ||
            !this.image
        ) {
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

        // Skip tiles that fall entirely outside the artefact mask (image coords -> SQE via
        // ppiAdjustmentFactor). Guarded by a cost cap so a huge tile grid × complex mask can't jank;
        // above the cap we simply keep every tile (the old behaviour).
        const rings = this.maskRings;
        const f = this.image.ppiAdjustmentFactor;
        const tilesX = Math.ceil(this.imageBoundingBox.width / tileWidth);
        const tilesY = Math.ceil(this.imageBoundingBox.height / tileHeight);
        const maskPoints = rings ? rings.reduce((s, r) => s + r.length, 0) : 0;
        const doMaskFilter =
            !!rings && tilesX * tilesY * maskPoints <= IIIFImageComponent.MASK_FILTER_MAX_COST;

        let xTranslate = 0; // How much to translate the tile
        for (let x = this.imageBoundingBox.x; x < endX; x += tileWidth) {
            const currentTileWidth = Math.min(tileWidth, endX - x);
            // Overlap the next tile by 1px to hide the seam between tiles (0 on the last column).
            const seamX = x + tileWidth < endX ? 1 : 0;

            let yTranslate = 0;
            for (let y = this.imageBoundingBox.y; y < endY; y += tileHeight) {
                const currentTileHeight = Math.min(tileHeight, endY - y);
                // Overlap the next tile by 1px to hide the seam between tiles (0 on the last row).
                const seamY = y + tileHeight < endY ? 1 : 0;

                const keep =
                    !doMaskFilter ||
                    rectIntersectsRings(
                        {
                            x0: x * f,
                            y0: y * f,
                            x1: (x + currentTileWidth) * f,
                            y1: (y + currentTileHeight) * f,
                        },
                        rings!
                    );

                if (keep) {
                    const url = this.image.getScaledAndCroppedUrl(
                        this.optimizedImageScaleFactor * 100,
                        x,
                        y,
                        currentTileWidth + 1,
                        currentTileHeight + 1
                    );
                    const tile = new TileInfo(
                        url,
                        `translate(${xTranslate}, ${yTranslate})`,
                        currentTileWidth * this.optimizedImageScaleFactor + seamX,
                        currentTileHeight * this.optimizedImageScaleFactor + seamY
                    );
                    if (!this.dynamic) {
                        tile.inView = true;
                    }
                    this.tiles.push(tile);
                }

                // Advance by the EXACT tile size — even for skipped tiles, so kept tiles keep their
                // correct positions. (Subtracting from the cumulative translate is what caused the
                // old left/up drift of overlays on wide plates; positions must stay exact.)
                yTranslate += currentTileHeight * this.optimizedImageScaleFactor;
            }
            xTranslate += currentTileWidth * this.optimizedImageScaleFactor;
        }

        this.$nextTick(() => {
            this.checkTilesInView();
        });
    }

    private checkTilesInView() {
        if (!this.dynamic) {
            return;
        }
        const div = this.surroundingDiv as HTMLElement;
        // Use the container's own viewport rect (same coordinate space as each tile's
        // getBoundingClientRect), expanded by a prebuffer margin so tiles just beyond the edges
        // load a little ahead of scrolling. (The previous code mixed getBoundingClientRect with
        // offsetLeft/offsetTop, which are different coordinate spaces.)
        const r = div.getBoundingClientRect();
        const mx = r.width * IIIFImageComponent.PREBUFFER;
        const my = r.height * IIIFImageComponent.PREBUFFER;
        const bboxDiv = {
            left: r.left - mx,
            top: r.top - my,
            right: r.right + mx,
            bottom: r.bottom + my,
        };

        for (const [idx, tile] of this.tiles.entries()) {
            const tileId = `iiif-image-${this.image.id}-tile-${idx}`;
            const tileElement = document.getElementById(
                tileId
            ) as SVGImageElement | null;
            if (!tileElement) {
                continue;
            }
            const bbox = tileElement.getBoundingClientRect();
            tile.inView =
                bbox.left <= bboxDiv.right &&
                bboxDiv.left <= bbox.right &&
                bbox.top <= bboxDiv.bottom &&
                bboxDiv.top <= bbox.bottom;
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

    // A low-res background image placed behind the tiles, to fill out any rounding artefacts between tiles.
    // The IIA IIIF server has a hard limit of 1000x1000 tiles. We want the scaled down image to fit in just one
    // tile - it is enough for removing the rounding artefacts.
    private get backgroundImageScale(): number {
        // Return the scale in percentages
        const max = Math.max(
            this.imageBoundingBox.width,
            this.imageBoundingBox.height
        ); // Max dimension of image
        let scale = (1000 / max) * 100; // Scale down (in percents) of max dimension down to 1000
        scale = Math.floor(scale);
        scale = Math.min(5, scale); // No more than 5% of the original image - anyway

        return scale;
    }

    public get backgroundImageUrl(): string | null {
        if (this.backgroundLoadError) {
            return null;
        }
        return this.image.getScaledAndCroppedUrl(
            this.backgroundImageScale,
            this.imageBoundingBox.x,
            this.imageBoundingBox.y,
            this.imageBoundingBox.width,
            this.imageBoundingBox.height
        );
    }

    public get backgroundImageTransform(): string {
        return `scale(${100 / this.backgroundImageScale})`; // Scale the image back to 100%
    }

    public onBackgroundLoadError() {
        this.backgroundLoadError = true;
        setTimeout(() => {
            this.backgroundLoadError = false;
        }, 100); // Try again in 100ms. Never stop trying.
    }

    public get groupTransform(): string {
        // Scale the images back to sqe coordinates.
        // The images are in imageCoordinates * optimizedImageScaleFactor,
        const optimizedImageToSqe =
            this.image.ppiAdjustmentFactor / this.optimizedImageScaleFactor;
        const scaleTransform = `scale(${optimizedImageToSqe})`;

        // The image is now in sqe coordinates, but at (0, 0) and not the bounding box. We need to move it.
        const translateTransform = `translate(${this.sqeBoundingBox.x}, ${this.sqeBoundingBox.y})`;

        return translateTransform + ' ' + scaleTransform;
    }
}
</script>

<style lang="scss" scoped></style>
