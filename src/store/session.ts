import { SessionState, RootState } from './types';
import { MutationTree, ActionTree, Module } from 'vuex';

function getLocalStorageSession(): SessionState {
    const sessionState: SessionState = {
        // sessionId: localStorage.getItem('sessionId') || undefined,
        userId: localStorage.getItem('userId') as (number | null) || undefined,
        loggedIn: localStorage.getItem('loggedIn') === 'true',
        userName: localStorage.getItem('userName') || undefined,
        token: localStorage.getItem('token') || undefined,
        // fullName: localStorage.getItem('fullName') || undefined,
    };

    return sessionState;
}

function setLocalStorageSession(state: SessionState) {
    function setEntry(key: string, value?: string) {
        if (value) {
            localStorage.setItem(key, value);
        } else {
            localStorage.removeItem(key);
        }
    }

    // setEntry('sessionId', state.sessionId);
    setEntry('userId', String(state.userId));
    setEntry('loggedIn', state.loggedIn ? 'true' : 'false');
    setEntry('userName', state.userName);
    // setEntry('fullName', state.fullName);
    setEntry('token', state.token);
}

const userState = getLocalStorageSession();

const mutations: MutationTree<SessionState> = {
    SET_LOGGED_IN(state, { sessionId, userId, userName, fullName, token }) {
        state.loggedIn = true;
        // state.sessionId = sessionId;
        state.userId = userId;
        state.userName = userName;
        // state.fullName = fullName;
        state.token = token;
    },

    SET_LOGGED_OUT(state) {
        state.loggedIn = false;
        // state.sessionId = undefined;
        state.userId = undefined;
        state.userName = undefined;
        // state.fullName = undefined;
        state.token = undefined;
    }
};


const actions: ActionTree<SessionState, RootState> = {
    logIn({ commit, state }, { userId, userName, token }) {
        commit('SET_LOGGED_IN', { userId, userName, token });
        setLocalStorageSession(state);
    },

    logOut({ commit, state }) {
        commit('SET_LOGGED_OUT');
        setLocalStorageSession(state);
    },
};

export function authHeader() {
    if (userState.loggedIn) {
        return { 'Authorization': 'Bearer ' + userState.token };
    } else {
        return {};
    }
}

const store: Module<SessionState, RootState> = {
    namespaced: true,
    state: userState,
    mutations,
    actions,
};

export default store;
