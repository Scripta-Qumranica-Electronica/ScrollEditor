import { IIIFImage } from '@/models/image';
import { Requests } from './requests';
import { Artefact } from '@/models/artefact';
import { ImagedObjectDTO, ImagedObjectListDTO } from '@/dtos/sqe-dtos';
import { ApiRoutes } from '@/services/api-routes';
import { CommHelper } from './comm-helper';

export default class ImageService {
    public async getImageManifest(image: IIIFImage): Promise<any> {
        const manifest = await Requests.requestImageManifest(image.manifestUrl);
        image.manifest = manifest;
    }
}
