import { DetailedSearchRequestDTO } from '@/dtos/sqe-dtos';
import axios from 'axios';
import { ApiRoutes } from './api-routes';

export default class SearchService {
    public async search(detailedSearchRequestDTO: DetailedSearchRequestDTO): Promise<any> {
        const response = await axios.post(ApiRoutes.searchUrl(), detailedSearchRequestDTO);
        return response.data;
    }
}
