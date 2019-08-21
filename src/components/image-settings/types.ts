import { IIIFImage } from '@/models/image';

export interface SingleImageSetting {
    // Keep information about the image itself, to make rendering based on the setting simpler
    image: IIIFImage;
    type: string;
    visible: boolean;
    opacity: number; // Between 0 and 1
}

// class, no interface because we can't directly instantiate an interface
// https://stackoverflow.com/a/53380776/7013333
export class ImageSetting {
    [image: string]: SingleImageSetting;
}
