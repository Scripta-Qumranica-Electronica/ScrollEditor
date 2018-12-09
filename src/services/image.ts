import { ImageInfo } from "@/models/image";

class ImageService {
    public async fillImageInformation(images: ImageInfo[]) {
        // TODO: Add a service-worker based cache for manifests
        const promises = images.map((image) => image.loadManifest());
        await Promise.all(promises);
    }
}
