import { PolygonDTO } from './misc';

export interface ArtefactDTO {
    id: number;
    editionId: number;
    imagedObjectId: string;
    name: string;
    mask: PolygonDTO;
    transformMatrix: string;
    zOrder: number;
    side: 'recto' | 'verso';
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
