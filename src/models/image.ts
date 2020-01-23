import { ImageStackDTO } from '@/dtos/sqe-dtos';
import { ImageDTO } from '@/dtos/sqe-dtos';
import { Polygon } from '@/utils/Polygons';
import { BoundingBox } from '@/utils/helpers';

export class IIIFImage {
    public url: string;
    public manifest: any; // TODO: Create a Typescript interface for this

    constructor(url: string) {
        this.url = url;
    }

    get manifestUrl() {
        return this.append('info.json');
    }

    get thumbnailUrl() {
        return this.getThumbnailUrl(150);
    }

    public getThumbnailUrl(width: number) {
        return this.append(`full/${width},/0/default.jpg`);
    }

    public fullUrl() {
        return this.getFullUrl(100);
    }

    public getFullUrl(pct: number, extension = 'jpg') {
        return this.append(`full/pct:${pct}/0/default.${extension}`);
    }

    public getScaledAndCroppedUrl(pct: number, x: number, y: number, width: number, height: number, extension = 'jpg') {
        return this.append(`${x},${y},${width},${height}/pct:${pct}/0/default.${extension}`);
    }

    // Returns a server-optimized scale factor for the image, based on the manifest.
    // Returns a percentage.
    //
    // We take the boundingBox into account - its width and height are the actual width and height we consult
    // (the default is the entire image's width and height)
    public getOptimizedScaleFactor(expectedWidth: number, expectedHeight: number, boundingBox?: BoundingBox): number {
        if (!this.manifest) {
            console.warn("Can't get the scale factor of an image without loading the manifest first");
            return 100;
        }

        const width: number = boundingBox ? boundingBox.width : this.manifest.width;
        const height: number = boundingBox ? boundingBox.height : this.manifest.height;

        if (this.manifest.sizes) {
            const widthFactor = width / this.manifest.width;
            const heightFactor = height / this.manifest.height;

            for (const resolution of this.manifest.sizes) {

                if (resolution.width * widthFactor  >= expectedWidth) {
                    return Math.ceil(100 * resolution.width / this.manifest.width);
                }
                if (resolution.height *  heightFactor >= expectedHeight) {
                    return Math.ceil(100 * resolution.height / this.manifest.height);
                }
            }
        }

        // Fallback - round up to the nearest 5%
        const realScale = 100 * Math.min(expectedWidth / width, expectedHeight / height);
        return Math.ceil(realScale / 5) * 5;
    }

    private append(suffix: string) {
        return `${this.url}/${suffix}`;
    }
}

export class Image extends IIIFImage {
    public type: string;
    public side: string;
    public waveLength: string[];
    public regionInMaster?: Polygon;
    public regionOfMaster?: Polygon;
    public transformToMaster: string;
    public master: boolean;
    public catalogNumber: number;
    public id: number;

    constructor(dto: ImageDTO) {
        super(dto.url);
        this.type = dto.type;
        this.side = dto.side;
        this.waveLength = dto.waveLength;
        this.regionInMaster = dto.regionInMasterImage ? new Polygon(dto.regionInMasterImage) : undefined;
        this.regionOfMaster = dto.regionInMasterImage ? new Polygon(dto.regionInMasterImage) : undefined;
        this.transformToMaster = dto.transformToMaster;
        this.master = dto.master;
        this.catalogNumber = dto.catalogNumber;
        this.id = dto.id;
    }
}

export class ImageStack {
    public id: number;
    public masterIndex: number;
    public images: Image[];
    public availableImageTypes: string[];
    private imageMap: Map<string, Image>;

    constructor(dto: ImageStackDTO) {
        if (dto.id === undefined || dto.masterIndex === undefined) {
            // This is just a temporary measure, the DTO will change so that undefined is not allowed
            throw new Error('ImageStack expects id and masterIndex to be set in the dto');
        }
        this.id = dto.id;
        this.masterIndex = dto.masterIndex;
        this.images = dto.images.map((d) => new Image(d));

        if (!this.images[this.masterIndex].master) {
            console.warn('ImageDTO conflict of master images: ', dto);
        }

        this.imageMap = new Map<string, Image>();
        this.availableImageTypes = [];
        for (const image of this.images) {
            if (this.imageMap.has(image.type)) {
                console.warn('ImageDTO has type ', image.type, ' multiple times', dto);
            }
            this.imageMap.set(image.type, image);
            this.availableImageTypes.push(image.type);
        }
    }

    public getImage(type: string) {
        return this.imageMap.get(type);
    }

    public get master(): Image {
        return this.images[this.masterIndex];
    }
}
