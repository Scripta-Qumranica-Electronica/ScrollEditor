import { DetailedSearchResponseDTO } from '@/dtos/sqe-dtos';

export class SearchFormData {
    public textDesignation?: string;
    public exactTextDesignation = false;

    public imageDesignation?: string;
    public exactImageDesignation = false;

    public textReference?: string[];
    public exactTextReference = false;

    public artefactDesignation?: string[];
    public exactArtefactDesignation = false;
}

export type SearchResults = DetailedSearchResponseDTO;
