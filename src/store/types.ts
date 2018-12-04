import { ScrollInfo } from '@/models/scroll';
// import Combination from '@/models/combination';

export interface LanguageState {
    language: string;
}

export interface SessionState {
    loggedIn: boolean;
    sessionId?: string;
    userId?: number;

    userName?: string;
    fullName?: string;
}

export interface MiscUIState {
    newScrollVersionId: number | null;
}

export interface RootState {

}
