export interface LanguageState {
    language: string;
}

export interface UserState {
    loggedIn: boolean;
    sessionId?: string;

    userName?: string;
    fullName?: string;
}

export interface RootState {

}
