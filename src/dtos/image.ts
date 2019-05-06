import { PolygonDTO } from './misc';

export interface ImageDTO {
    url: string;
    lightingType: 'direct' | 'raking';
    lightingDirection: 'left' | 'right' | 'top';
    waveLength: string[];
    type: string;
    side: string;
    regionInMaster: PolygonDTO;
    regionOfMaster: PolygonDTO;
    transformToMaster: string;
    master: boolean;
    catalogNumber: number;
}

export interface ImageListDTO {
    images: ImageDTO[];
}

export interface ImageGroupDTO {
    id: number;
    institution: string;
    catalogNumber1: string;
    catalogNumber2: string;
    catalogSide: number;
    images: ImageDTO[];
}
export interface ImageGroupListDTO {
    imageGroups: ImageGroupDTO[];
}

export interface ImageInstitutionDTO {
    name: string;
}

export interface ImageInstitutionListDTO {
    institutions: ImageInstitutionDTO[];
}