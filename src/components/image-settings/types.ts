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
