export interface LanguageState {
    language: string;
}

export interface SessionState {
    loggedIn: boolean;
    sessionId?: string;

    userName?: string;
    fullName?: string;
}

export interface RootState {

}
