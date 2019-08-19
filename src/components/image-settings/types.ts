import { IIIFImage } from '@/models/image';

// export class Params {
//     public imageSettings: ImageSetting;
//     public zoom: number;  // Zoom between 0 and 1
//     public rotationAngle: number;

//     constructor() {
//         this.imageSettings = {} as ImageSetting;
//         this.zoom = 0.1;
//         this.rotationAngle = 0;
//     }
// }

export interface SingleImageSetting {
    // Keep information about the image itself, to make rendering based on the setting simpler
    image: IIIFImage;
    type: string;
    visible: boolean;
    opacity: number; // Between 0 and 1
}

export interface ImageSetting {
    [image: string]: SingleImageSetting;
}
