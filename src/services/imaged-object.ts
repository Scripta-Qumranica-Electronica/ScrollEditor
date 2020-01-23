import { ImagedObject } from '@/models/imaged-object';
import { CommHelper } from './comm-helper';
import { ApiRoutes } from '@/services/api-routes';
import { ImagedObjectListDTO } from '@/dtos/sqe-dtos';


class ImagedObjectService {
    public async getEditionImagedObjects(editionId: number): Promise<ImagedObject[]> {
        const response = await CommHelper.get<ImagedObjectListDTO>(
            ApiRoutes.allEditionImagedObjectsUrl(editionId, true)
        );

        return response.data.imagedObjects.map((d: any) => new ImagedObject(d));
    }
}

export default ImagedObjectService;
