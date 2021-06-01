import { IIIFImage } from '@/models/image';
import axios from 'axios';

export default class ImageService {
    public async getImageManifest(image: IIIFImage): Promise<any> {
        const response = await axios.get(image.manifestUrl);
        return response.data;
    }
}
