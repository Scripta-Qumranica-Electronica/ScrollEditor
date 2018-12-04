import { ScrollInfo, ScrollVersionInfo } from '@/models/scroll';

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

export interface ScrollState {
    scrollVersion: ScrollVersionInfo | null;
    newScrollVersionId: number | null;
}

export interface RootState {

}
