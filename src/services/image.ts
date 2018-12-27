import { IIIFImage } from '@/models/image';
import axios from 'axios';

export default class ImageService {
    public async fetchImageManifest(image: IIIFImage) {
        const response = await axios.get(image.manifestUrl);
        image.manifest = response.data;
        return image.manifest;
    }

    public async fetchImageManifests(images: IIIFImage[]) {
        const properImages = images.filter((image) => image instanceof IIIFImage); // Filter out nulls and undefined

        // Load all manifests concurrently
        const promises = properImages.filter((image) => this.fetchImageManifest(image));
        await Promise.all(promises);
    }
}
