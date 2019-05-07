import { EditionInfo } from '@/models/edition';
import { ImagedObject } from '@/models/imaged-object';

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
    imagedObjects: ImagedObject[] | null;
}

export interface ImagedObjectState {
    imagedObject: ImagedObject | null;
    // artefacts: Artefact[] | null;

}
export interface MaskState {
    mask: string | null;
}

export interface RootState {

}
