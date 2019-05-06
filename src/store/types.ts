import { EditionInfo } from '@/models/edition';
import { ImagedObjectDetailed } from '@/models/imagedObject';

export interface LanguageState {
    language: string;
}

export interface SessionState {
    loggedIn: boolean;
    sessionId?: string;
    userId?: number;

    userName?: string;
    fullName?: string;
    token?: string;
}

export interface EditionState {
    editionId: EditionInfo | null;
    newEditionId: number | null;
    imagedObjects: ImagedObjectDetailed[] | null;
}

export interface ImagedObjectState {
    imagedObject: ImagedObjectDetailed | null;
    // artefacts: Artefact[] | null;

}
export interface MaskState {
    mask: string | null;
}

export interface RootState {

}
