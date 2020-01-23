import { IIIFImage } from '@/models/image';
import axios from 'axios';

export default class ImageService {
    public async getImageManifest(image: IIIFImage): Promise<any> {
        console.log(image.manifestUrl, 'image.manifestUrl');
        const response = await axios.get(image.manifestUrl);
        return response.data;
    }
}
