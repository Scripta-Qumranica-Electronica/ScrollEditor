import { IIIFImage } from '@/models/image';

export interface SingleImageSetting {
    // Keep information about the image itself, to make rendering based on the setting simpler
    image: IIIFImage;
    type: string;
    visible: boolean;
    opacity: number; // Between 0 and 1
    normalizedOpacity: number;
}

export interface ImageSetting {
    [image: string]: SingleImageSetting;
}

export function normalizeOpacity(settings: ImageSetting) {
    let filteredImageList = Object.values(settings).filter(x => x.visible);

    if (filteredImageList.length === 0) {
        // No visible images, make the first one visiblesTf
        Object.values(settings)[0].visible = true;
        filteredImageList = Object.values(settings).filter(x => x.visible);
    }
    const firstOpacity = filteredImageList[0].opacity;
    const numVisible = filteredImageList.length;

    let fullOpacity = numVisible;
    for (const [i, val] of filteredImageList.entries()) {
        if (i === 0) {
            val.normalizedOpacity = 1;
            fullOpacity -= val.opacity + numVisible - 1;
        } else {
            val.normalizedOpacity =
                val.opacity * ((numVisible - i) / numVisible) + ((fullOpacity * val.opacity) / numVisible);
            fullOpacity += 1 - val.opacity;
        }
    }
}
