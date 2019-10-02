import { IIIFImage } from '@/models/image';
import { Requests } from './requests';
import { Artefact } from '@/models/artefact';
import { ImagedObjectDTO, ImagedObjectListDTO } from '@/dtos/sqe-dtos';
import { ApiRoutes } from '@/services/api-routes';
import { CommHelper } from './comm-helper';

export default class ImageService {
    public async requestImageManifest(image: IIIFImage) {
        const manifest = await Requests.requestImageManifest(image.manifestUrl);
        image.manifest = manifest;
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
