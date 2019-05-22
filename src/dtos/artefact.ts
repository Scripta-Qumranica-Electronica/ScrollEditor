import { PolygonDTO } from './misc';

export interface ArtefactDTO {
    id: number;
    editionId: number;
    imagedObjectId: string;
    name: string;
    mask: PolygonDTO;
    transformMatrix: string;
    zOrder: number;
    side: 'recto' | 'verso' | number;  // The server returns 0 and 1, which will be fixed in the future
}

export interface ArtefactDesignationDTO {
    artefactId: number;
    imageCatalogId: number;
    name: string;
    side: string;
}

export interface ArtefactListDTO {
    artefacts: ArtefactDTO[];
}

export interface ArtefactDesignationListDTO {
    artefactDesignations: ArtefactDesignationDTO[];
}

export interface UpdateArtefactDTO {
    mask: string;
    name: string;
    position: string;
}

export interface CreateArtefactDTO {
    masterImageId: number;
    mask: string;
    name: string;
    position: string;
}
