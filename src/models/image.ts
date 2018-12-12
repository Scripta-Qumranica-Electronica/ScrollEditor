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

    private append(suffix: string) {
        return `${this.url}/${suffix}`;
    }
}

export class IIAImageSet {
    public imageCatalogId: number;
    public color?: IIIFImage;
    public infrared?: IIIFImage;
    public rakingLeft?: IIIFImage;
    public rakingRight?: IIIFImage;

    constructor(serverObj: any) {
        this.imageCatalogId = serverObj.image_catalog_id;
        this.color = this.createIIIF(serverObj.color);
        this.infrared = this.createIIIF(serverObj.infrared);
        this.rakingLeft = this.createIIIF(serverObj.raking_left);
        this.rakingRight = this.createIIIF(serverObj.raking_right);
    }

    private createIIIF(url: string | undefined) {
        if (url) {
            return new IIIFImage(url);
        }

        return undefined;
    }
}
