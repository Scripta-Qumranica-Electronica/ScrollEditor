import { UserState, RootState } from "./types";
import { MutationTree, Module } from 'vuex';

function getLocalStorageSession(): string | undefined {
    const sessionId = localStorage.getItem('sessionId');
    if (sessionId === null) {
        return undefined;
    } else {
        return sessionId;
    }
}

function setLocalStorageSession(sessionId?: string) {
    if (sessionId) {
        localStorage.setItem('sessionId', sessionId);
    } else {
        localStorage.removeItem('sessionId');
    }
}

const userState: UserState = {
    loggedIn: false,
    sessionId: getLocalStorageSession(),
    userName: undefined,
    fullName: undefined,
};

/*
const mutations: MutationTree<UserState> = {
    SET_LOGGED_IN(state, payload: boolean) {
        state.loggedIn = payload;
    },

    SET_SESSION_ID(state, payload: string) {
        state.sessionId = payload;
    },

    SET_USER_NAME(state, payload: string) {
        state.userName = payload;
    },

    SET_FULL_NAME(state, payload: string) {
        state.fullName = payload;
    }
} */

const store: Module<UserState, RootState> = {
    namespaced: true,
    state: userState,
    //mutations,
    //actions,
};

export default store;
