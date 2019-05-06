import { ImageDTO } from './image';
import { ArtefactDTO } from './artefact';

export interface ImageStackDTO {
    id?: number;
    images: ImageDTO[];
    masterIndex?: number;
}

export interface ImagedObjectDTO {
    id: string;
    recto: ImageStackDTO;
    verso: ImageStackDTO;
    artefacts?: ArtefactDTO[];
}

export interface ImagedObjectListDTO {
    imagedObjects: ImagedObjectDTO[];
}
