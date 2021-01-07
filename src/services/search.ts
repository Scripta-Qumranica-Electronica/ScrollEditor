import { DetailedSearchRequestDTO } from '@/dtos/sqe-dtos';
import axios from 'axios';
import { det } from 'mathjs';
import { ApiRoutes } from './api-routes';

export default class SearchService {
    public async search(detailedSearchRequestDTO: DetailedSearchRequestDTO): Promise<any> {
        if (!detailedSearchRequestDTO.artefactDesignation)  {
            detailedSearchRequestDTO.artefactDesignation = [];
        }

        if (!detailedSearchRequestDTO.textReference) {
            detailedSearchRequestDTO.textReference = [];
        }

        const response = await axios.post(ApiRoutes.searchUrl(), detailedSearchRequestDTO);
        return response.data;
    }
}
