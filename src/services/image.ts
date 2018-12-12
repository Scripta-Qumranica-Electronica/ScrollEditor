import { IIIFImage } from '@/models/image';
import axios from 'axios';

class ImageService {
    public async loadImageManifest(image: IIIFImage) {
        const response = await axios.get(image.manifestUrl);
        image.manifest = response.data;

        return image.manifest;
    }

    public async loadImageManifests(images: IIIFImage[]) {
        const properImages = images.filter((image) => image instanceof IIIFImage); // Filter out nulls and undefined

        // Load all manifests concurrently
        const promises = properImages.filter((image) => this.loadImageManifest(image));
        await Promise.all(promises);
    }
}
