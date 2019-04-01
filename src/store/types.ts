import { ScrollInfo, ScrollVersionInfo } from '@/models/scroll';
import { Fragment } from '@/models/fragment';

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

export interface ScrollState {
    scrollVersion: ScrollVersionInfo | null;
    newScrollVersionId: number | null;
    fragments: Fragment[] | null;
}

export interface FragmentState {
    fragment: Fragment | null;
    // artefacts: Artefact[] | null;

}
export interface MaskState {
    mask: string | null;
}

export interface RootState {

}
