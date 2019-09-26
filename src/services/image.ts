import { IIIFImage } from '@/models/image';
import axios from 'axios';

export default class ImageService {
    public async requestImageManifest(image: IIIFImage) {
        const response = await axios.get(image.manifestUrl);
        image.manifest = response.data;
        return image.manifest;
    }

    public async requestImageManifests(images: IIIFImage[]) {
        const properImages = images.filter((image) => image instanceof IIIFImage);
        // Filter out nulls and undefined
        // Load all manifests concurrently
        const promises = properImages.filter((image) => this.requestImageManifest(image));
        await Promise.all(promises);
    }
}
