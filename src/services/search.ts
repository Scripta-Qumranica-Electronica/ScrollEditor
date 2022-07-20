import { DetailedSearchRequestDTO, DetailedSearchResponseDTO } from '@/dtos/sqe-dtos';
import { CommHelper } from './comm-helper';
import { ApiRoutes } from './api-routes';

export default class SearchService {
    public async search(detailedSearchRequestDTO: DetailedSearchRequestDTO): Promise<DetailedSearchResponseDTO> {
        if (!detailedSearchRequestDTO.artefactDesignation)  {
            detailedSearchRequestDTO.artefactDesignation = [];
        }

        if (!detailedSearchRequestDTO.textReference) {
            detailedSearchRequestDTO.textReference = [];
        }

        const response = await CommHelper.post<DetailedSearchResponseDTO>(ApiRoutes.searchUrl(), detailedSearchRequestDTO);
        return response.data;
    }
}
