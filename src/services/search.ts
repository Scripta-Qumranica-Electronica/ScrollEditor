import { DetailedSearchRequestDTO, DetailedSearchResponseDTO } from '@/dtos/sqe-dtos';
import axios from 'axios';
import { det } from 'mathjs';
import { ApiRoutes } from './api-routes';

export default class SearchService {
    public async search(detailedSearchRequestDTO: DetailedSearchRequestDTO): Promise<DetailedSearchResponseDTO> {
        if (!detailedSearchRequestDTO.artefactDesignation)  {
            detailedSearchRequestDTO.artefactDesignation = [];
        }

        if (!detailedSearchRequestDTO.textReference) {
            detailedSearchRequestDTO.textReference = [];
        }

        const response = await axios.post<DetailedSearchResponseDTO>(ApiRoutes.searchUrl(), detailedSearchRequestDTO);
        return response.data;
    }
}
