import axios, { AxiosResponse } from 'axios';

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

    private append(suffix: string) {
        return `${this.url}/${suffix}`;
    }
}

export abstract class ImageSet {
    public imageCatalogId: number;
    public sqeImageId: number;
    public abstract get master(): IIIFImage | undefined;
    public abstract get availableImageTypes(): string[];

    constructor(imageCatalogId: number, sqeImageId: number) {
        this.imageCatalogId = imageCatalogId;
        this.sqeImageId = sqeImageId;
    }

    public getImage(type: string) {
        const candidate: any = (this as any)[type];
        if (candidate && candidate instanceof IIIFImage) {
            return candidate;
        }

        return undefined;
    }

    public get images(): IIIFImage[] {
        let images = this.availableImageTypes.map((t) => this.getImage(t));
        images = images.filter((image) => image !== undefined);

        return images as IIIFImage[];
    }
}

export class IIAImageSet extends ImageSet {
    private static availableImages = ['color', 'infrared', 'rakingLeft', 'rakingRight'];

    public color?: IIIFImage;
    public infrared?: IIIFImage;
    public rakingLeft?: IIIFImage;
    public rakingRight?: IIIFImage;

    constructor(serverObj: any) {
        super(serverObj.image_catalog_id, serverObj.id_of_sqe_image);
        this.color = this.createIIIF(serverObj.color);
        this.infrared = this.createIIIF(serverObj.infrared);
        this.rakingLeft = this.createIIIF(serverObj['raking-left']);
        this.rakingRight = this.createIIIF(serverObj['raking-right']);
    }

    private createIIIF(url: string | undefined) {
        if (url) {
            return new IIIFImage(url);
        }

        return undefined;
    }

    public get availableImageTypes() {
        return IIAImageSet.availableImages;
    }

    public get master(): IIIFImage | undefined {
        return this.color;
    }
}
